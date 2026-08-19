import {
  MeetingConfigurationError,
  MeetingConflictError,
  MeetingInputError,
  MEETING_OPERATION_TIMEOUT_MS,
  meetingUtcSlot,
  scheduleMeeting,
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
  unavailable,
  withSession,
  writeDedupe,
} from "@/lib/abuse-protection";

export const runtime = "nodejs";

const LOCK_TTL_SECONDS =
  Math.ceil(MEETING_OPERATION_TIMEOUT_MS / 1_000) + 30;

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

type MeetingDedupeRecord = {
  version: 1;
  requestDigest: string;
  meetLink?: string;
  calendarLink?: string;
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

function isMeetingDedupeRecord(value: unknown): value is MeetingDedupeRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.requestDigest === "string" &&
    /^[a-f0-9]{64}$/.test(record.requestDigest) &&
    optionalHttpsUrl(record.meetLink) &&
    optionalHttpsUrl(record.calendarLink)
  );
}

function optionalHttpsUrl(value: unknown) {
  if (value === undefined) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function replayResponse(
  replay: MeetingDedupeRecord,
  sessionCookie: string | undefined,
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
    sessionCookie,
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

    const idempotency = request.headers.get("idempotency-key")?.trim();
    if (!idempotency || idempotency.length > 200) {
      return withSession(
        json({ error: "An Idempotency-Key is required." }, 400),
        protection.sessionCookie,
      );
    }

    try {
      const validated = dependencies.validateMeetingRequest(parsed.body);
      const slot = dependencies.meetingUtcSlot(validated);
      const idempotencyDigest = dependencies.digest(idempotency);
      const requestDigest = dependencies.digest(
        JSON.stringify({
          name: validated.name,
          email: validated.email,
          slot,
          timeZone: validated.timeZone,
        }),
      );
      const operation = { idempotencyDigest, requestDigest };
      const idempotencyKey = `meeting-idempotency:${idempotencyDigest}`;
      const idempotencyOwner = await dependencies.acquire(
        idempotencyKey,
        LOCK_TTL_SECONDS,
      );
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
        const replay = await dependencies.readDedupe<unknown>(
          `meeting:${idempotencyDigest}`,
        );
        if (replay !== null) {
          if (!isMeetingDedupeRecord(replay)) {
            throw new ProtectionUnavailableError();
          }
          if (replay.requestDigest !== requestDigest) {
            return withSession(
              json({ error: "That idempotency key was already used." }, 409),
              protection.sessionCookie,
            );
          }
          return replayResponse(replay, protection.sessionCookie);
        }

        const activeKey = `meeting-active:${protection.identity}`;
        const slotKey = `meeting-slot:${dependencies.digest(slot)}`;
        const activeOwner = await dependencies.acquire(
          activeKey,
          LOCK_TTL_SECONDS,
        );
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
          const slotOwner = await dependencies.acquire(
            slotKey,
            LOCK_TTL_SECONDS,
          );
          if (!slotOwner) {
            return withSession(
              json({ error: "That time is no longer available." }, 409),
              protection.sessionCookie,
            );
          }

          try {
            const meeting = await dependencies.scheduleMeeting(
              validated,
              operation,
            );
            try {
              await dependencies.writeDedupe(`meeting:${idempotencyDigest}`, {
                version: 1,
                requestDigest,
                meetLink: meeting.meetLink,
                calendarLink: meeting.calendarLink,
              } satisfies MeetingDedupeRecord);
            } catch (error) {
              // Calendar creation already succeeded. Its private operation
              // metadata lets the same idempotency key recover the event safely.
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
      if (error instanceof MeetingConfigurationError) {
        return withSession(
          Response.json({ error: error.message }, { status: 503 }),
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
