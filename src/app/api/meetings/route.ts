import {
  MeetingConflictError,
  MeetingInputError,
  scheduleMeeting,
  meetingUtcSlot,
  validateMeetingRequest,
} from "@/features/meeting-scheduling/schedule-meeting";
import {
  acquire,
  digest,
  json,
  protect,
  ProtectionUnavailableError,
  readDedupe,
  readJson,
  release,
  withSession,
  unavailable,
  writeDedupe,
} from "@/lib/abuse-protection";

export const runtime = "nodejs";

type MeetingsDependencies = {
  protect: typeof protect;
  readJson: typeof readJson;
  validateMeetingRequest: typeof validateMeetingRequest;
  meetingUtcSlot: typeof meetingUtcSlot;
  scheduleMeeting: typeof scheduleMeeting;
  digest: typeof digest;
  acquire: typeof acquire;
  release: typeof release;
  readDedupe: typeof readDedupe;
  writeDedupe: typeof writeDedupe;
};

const defaultDependencies: MeetingsDependencies = {
  protect,
  readJson,
  validateMeetingRequest,
  meetingUtcSlot,
  scheduleMeeting,
  digest,
  acquire,
  release,
  readDedupe,
  writeDedupe,
};

async function releaseBestEffort(
  releaseLock: MeetingsDependencies["release"],
  key: string,
  owner: string | false,
) {
  try {
    await releaseLock(key, owner);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "abuse_lock_release_failure",
        operation: "meetings",
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
}

function logDedupePersistenceFailure(error: unknown) {
  console.error(
    JSON.stringify({
      event: "meeting_dedupe_persistence_failure",
      kind: error instanceof Error ? error.name : "unknown",
    }),
  );
}

export function createMeetingsPost(
  overrides: Partial<MeetingsDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };
  return async function POST(request: Request) {
    const protection = await dependencies.protect("meetings", request);
    if (protection instanceof Response) {
      return protection;
    }
    const parsed = await dependencies.readJson(request, "meetings");
    if (parsed.response) {
      return withSession(parsed.response, protection.sessionCookie);
    }
    const body = parsed.body;
    const idempotency = request.headers.get("idempotency-key")?.trim();
    if (!idempotency || idempotency.length > 200) {
      return withSession(
        json({ error: "An Idempotency-Key is required." }, 400),
        protection.sessionCookie,
      );
    }
    try {
      const validated = dependencies.validateMeetingRequest(body);
      const idemHash = dependencies.digest(idempotency);
      const canonicalDigest = dependencies.digest(
        JSON.stringify({
          name: validated.name,
          email: validated.email,
          slot: dependencies.meetingUtcSlot(validated),
          timeZone: validated.timeZone,
        }),
      );
      const idempotencyKey = `meeting-idempotency:${idemHash}`;
      const idempotencyOwner = await dependencies.acquire(idempotencyKey, 180);
      if (!idempotencyOwner) {
        return withSession(
          json(
            {
              error:
                "A request with this idempotency key is already in progress. Please try again shortly.",
            },
            429,
            30,
          ),
          protection.sessionCookie,
        );
      }
      try {
        const replay = await dependencies.readDedupe<{
          slot: string;
          requestDigest: string;
          meetLink?: string;
          calendarLink?: string;
        }>(`meeting:${idemHash}`);
        if (replay && replay.requestDigest !== canonicalDigest) {
          return withSession(
            json({ error: "That idempotency key was already used." }, 409),
            protection.sessionCookie,
          );
        }
        if (
          replay &&
          replay.slot === `${validated.start}:${validated.timeZone}`
        ) {
          return withSession(
            Response.json(
              {
                ok: true,
                meetLink: replay.meetLink,
                calendarLink: replay.calendarLink,
              },
              { status: 201 },
            ),
            protection.sessionCookie,
          );
        }
        const activeKey = `meeting-active:${protection.identity}`;
        const slotKey = `meeting-slot:${dependencies.digest(dependencies.meetingUtcSlot(validated))}`;
        const activeOwner = await dependencies.acquire(activeKey, 180);
        if (!activeOwner) {
          return withSession(
            json(
              {
                error:
                  "A meeting request is already in progress. Please try again shortly.",
              },
              429,
              30,
            ),
            protection.sessionCookie,
          );
        }
        try {
          const slotOwner = await dependencies.acquire(slotKey, 180);
          if (!slotOwner) {
            return withSession(
              json({ error: "That time is no longer available." }, 409),
              protection.sessionCookie,
            );
          }
          try {
            const meeting = await dependencies.scheduleMeeting(validated);
            try {
              await dependencies.writeDedupe(`meeting:${idemHash}`, {
                slot: `${validated.start}:${validated.timeZone}`,
                requestDigest: canonicalDigest,
                meetLink: meeting.meetLink,
                calendarLink: meeting.calendarLink,
              });
            } catch (error) {
              // Calendar event creation already succeeded. Deterministic event
              // IDs make a later retry replay the event without notification.
              logDedupePersistenceFailure(error);
            }
            return withSession(
              Response.json(
                {
                  ok: true,
                  meetLink: meeting.meetLink,
                  calendarLink: meeting.calendarLink,
                },
                { status: 201 },
              ),
              protection.sessionCookie,
            );
          } finally {
            await releaseBestEffort(dependencies.release, slotKey, slotOwner);
          }
        } finally {
          await releaseBestEffort(dependencies.release, activeKey, activeOwner);
        }
      } finally {
        await releaseBestEffort(
          dependencies.release,
          idempotencyKey,
          idempotencyOwner,
        );
      }
    } catch (error) {
      if (error instanceof MeetingInputError) {
        return withSession(
          Response.json({ error: error.message }, { status: 400 }),
          protection.sessionCookie,
        );
      }
      if (error instanceof MeetingConflictError) {
        return withSession(
          Response.json({ error: error.message }, { status: 409 }),
          protection.sessionCookie,
        );
      }
      if (error instanceof ProtectionUnavailableError) {
        return withSession(unavailable(), protection.sessionCookie);
      }
      console.error(
        JSON.stringify({
          event: "meeting_upstream_failure",
          kind: error instanceof Error ? error.name : "unknown",
        }),
      );
      return withSession(
        Response.json(
          { error: "Unable to schedule a meeting right now." },
          { status: 502 },
        ),
        protection.sessionCookie,
      );
    }
  };
}

export const POST = createMeetingsPost();
