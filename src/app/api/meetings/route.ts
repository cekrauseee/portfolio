import type {
  MeetingErrorCode,
  MeetingErrorPayload,
} from "@/features/meeting-scheduling/errors";
import {
  MeetingConfigurationError,
  MeetingConflictError,
  MeetingInputError,
  MEETING_OPERATION_TIMEOUT_MS,
  meetingUtcSlot,
  scheduleMeeting,
  validateMeetingRequest,
  type MeetingScheduleDiagnostic,
} from "@/features/meeting-scheduling/schedule-meeting";
import {
  acquire,
  digest,
  protect,
  ProtectionUnavailableError,
  readDedupe,
  readJson,
  release,
  withSession,
  writeDedupe,
  type ProtectionDiagnostic,
} from "@/lib/abuse-protection";
import {
  createOperationEvent,
  writeOperationEvent,
  type OperationEventWriter,
} from "@/lib/operation-event";
import { safeErrorDetails, type SafeErrorDetails } from "@/lib/safe-error";

export const runtime = "nodejs";

const LOCK_TTL_SECONDS = Math.ceil(MEETING_OPERATION_TIMEOUT_MS / 1_000) + 30;

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
  logOperation: OperationEventWriter;
};

type MeetingDedupeRecord = {
  version: 1;
  requestDigest: string;
  meetLink?: string;
  calendarLink?: string;
};

type MeetingsTelemetry = {
  stage: string;
  outcome: string;
  protection?: ProtectionDiagnostic;
  input?: { name_length: number; email_length: number };
  idempotency?: {
    replayed?: boolean;
    dedupe_persisted?: boolean;
    error?: SafeErrorDetails;
  };
  scheduling?: {
    outcome: "completed" | "failed";
    duration_ms: number;
    replayed?: boolean;
    error?: SafeErrorDetails;
    owner_notification?: MeetingScheduleDiagnostic["owner_notification"];
  };
  cleanup?: {
    lock_release_failures: number;
    first_error?: SafeErrorDetails;
  };
  error?: SafeErrorDetails;
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
  logOperation: writeOperationEvent,
};

export function createMeetingsPost(
  overrides: Partial<MeetingsDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function POST(request: Request) {
    const operation = createOperationEvent(
      request,
      "meeting_scheduling",
      dependencies.logOperation,
    );
    const telemetry: MeetingsTelemetry = {
      stage: "protection",
      outcome: "failed",
    };

    let response: Response;
    try {
      response = await handleMeetingsPost(
        request,
        dependencies,
        telemetry,
        operation.operationId,
      );
    } catch (error) {
      telemetry.stage = "handler";
      telemetry.outcome = "failed";
      telemetry.error = safeErrorDetails(error);
      response = meetingErrorResponse(
        "schedule_failed",
        operation.operationId,
        502,
      );
    }

    return operation.complete(response, telemetry);
  };
}

async function handleMeetingsPost(
  request: Request,
  dependencies: MeetingsDependencies,
  telemetry: MeetingsTelemetry,
  operationId: string,
) {
  const respond = (
    response: Response,
    outcome: string,
    stage = telemetry.stage,
  ) => {
    telemetry.outcome = outcome;
    telemetry.stage = stage;
    return response;
  };

  const protection = await dependencies.protect(
    "meetings",
    request,
    (diagnostic) => {
      telemetry.protection = diagnostic;
    },
  );
  if (protection instanceof Response) {
    const code = protectionErrorCode(protection.status);
    return respond(
      meetingErrorResponse(
        code,
        operationId,
        protection.status,
        protection.headers,
      ),
      code,
    );
  }

  telemetry.stage = "request";
  const parsed = await dependencies.readJson(request, "meetings");
  if (parsed.response) {
    return respond(
      withSession(
        meetingErrorResponse(
          "invalid_meeting",
          operationId,
          parsed.response.status,
          parsed.response.headers,
        ),
        protection.sessionCookie,
      ),
      "invalid_meeting",
    );
  }

  telemetry.stage = "validation";
  const idempotency = request.headers.get("idempotency-key")?.trim();
  if (!idempotency || idempotency.length > 200) {
    return respond(
      withSession(
        meetingErrorResponse("invalid_meeting", operationId, 400),
        protection.sessionCookie,
      ),
      "invalid_meeting",
    );
  }

  try {
    const validated = dependencies.validateMeetingRequest(parsed.body);
    telemetry.input = {
      name_length: validated.name.length,
      email_length: validated.email.length,
    };
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
    const meetingOperation = { idempotencyDigest, requestDigest };
    const idempotencyKey = `meeting-idempotency:${idempotencyDigest}`;

    telemetry.stage = "idempotency_lock";
    const idempotencyOwner = await dependencies.acquire(
      idempotencyKey,
      LOCK_TTL_SECONDS,
    );
    if (!idempotencyOwner) {
      return respond(
        withSession(
          meetingErrorResponse("rate_limited", operationId, 429, {
            "Retry-After": "30",
          }),
          protection.sessionCookie,
        ),
        "rate_limited",
      );
    }

    try {
      telemetry.stage = "dedupe";
      const replay = await dependencies.readDedupe<unknown>(
        `meeting:${idempotencyDigest}`,
      );
      if (replay !== null) {
        if (!isMeetingDedupeRecord(replay)) {
          throw new ProtectionUnavailableError();
        }
        if (replay.requestDigest !== requestDigest) {
          return respond(
            withSession(
              meetingErrorResponse("conflict", operationId, 409),
              protection.sessionCookie,
            ),
            "conflict",
          );
        }
        telemetry.idempotency = { replayed: true, dedupe_persisted: true };
        return respond(
          replayResponse(replay, protection.sessionCookie),
          "completed",
          "complete",
        );
      }

      const activeKey = `meeting-active:${protection.identity}`;
      const slotKey = `meeting-slot:${dependencies.digest(slot)}`;
      telemetry.stage = "visitor_lock";
      const activeOwner = await dependencies.acquire(
        activeKey,
        LOCK_TTL_SECONDS,
      );
      if (!activeOwner) {
        return respond(
          withSession(
            meetingErrorResponse("rate_limited", operationId, 429, {
              "Retry-After": "30",
            }),
            protection.sessionCookie,
          ),
          "rate_limited",
        );
      }

      try {
        telemetry.stage = "slot_lock";
        const slotOwner = await dependencies.acquire(slotKey, LOCK_TTL_SECONDS);
        if (!slotOwner) {
          return respond(
            withSession(
              meetingErrorResponse("conflict", operationId, 409),
              protection.sessionCookie,
            ),
            "conflict",
          );
        }

        try {
          telemetry.stage = "scheduling";
          const schedulingStartedAt = Date.now();
          let scheduleDiagnostic: MeetingScheduleDiagnostic | undefined;
          let meeting;
          try {
            meeting = await dependencies.scheduleMeeting(
              validated,
              meetingOperation,
              (diagnostic) => {
                scheduleDiagnostic = diagnostic;
              },
            );
            telemetry.scheduling = {
              outcome: "completed",
              duration_ms: Date.now() - schedulingStartedAt,
              replayed: meeting.replayed,
              owner_notification: scheduleDiagnostic?.owner_notification,
            };
          } catch (error) {
            telemetry.scheduling = {
              outcome: "failed",
              duration_ms: Date.now() - schedulingStartedAt,
              error: safeErrorDetails(error),
              owner_notification: scheduleDiagnostic?.owner_notification,
            };
            throw error;
          }

          telemetry.idempotency = { replayed: Boolean(meeting.replayed) };
          try {
            await dependencies.writeDedupe(`meeting:${idempotencyDigest}`, {
              version: 1,
              requestDigest,
              meetLink: meeting.meetLink,
              calendarLink: meeting.calendarLink,
            } satisfies MeetingDedupeRecord);
            telemetry.idempotency.dedupe_persisted = true;
          } catch (error) {
            // Calendar creation already succeeded. Private operation metadata
            // lets this idempotency key recover the event safely.
            telemetry.idempotency.dedupe_persisted = false;
            telemetry.idempotency.error = safeErrorDetails(error);
          }

          return respond(
            withSession(
              Response.json(
                {
                  ok: true,
                  meetLink: meeting.meetLink,
                  calendarLink: meeting.calendarLink,
                },
                { status: 201 },
              ),
              protection.sessionCookie,
            ),
            "completed",
            "complete",
          );
        } finally {
          await releaseBestEffort(
            dependencies.release,
            slotKey,
            slotOwner,
            telemetry,
          );
        }
      } finally {
        await releaseBestEffort(
          dependencies.release,
          activeKey,
          activeOwner,
          telemetry,
        );
      }
    } finally {
      await releaseBestEffort(
        dependencies.release,
        idempotencyKey,
        idempotencyOwner,
        telemetry,
      );
    }
  } catch (error) {
    telemetry.error = safeErrorDetails(error);
    if (error instanceof MeetingInputError) {
      return respond(
        withSession(
          meetingErrorResponse("invalid_meeting", operationId, 400),
          protection.sessionCookie,
        ),
        "invalid_meeting",
      );
    }
    if (error instanceof MeetingConfigurationError) {
      return respond(
        withSession(
          meetingErrorResponse("service_unavailable", operationId, 503),
          protection.sessionCookie,
        ),
        "service_unavailable",
      );
    }
    if (error instanceof MeetingConflictError) {
      return respond(
        withSession(
          meetingErrorResponse("conflict", operationId, 409),
          protection.sessionCookie,
        ),
        "conflict",
      );
    }
    if (error instanceof ProtectionUnavailableError) {
      return respond(
        withSession(
          meetingErrorResponse("service_unavailable", operationId, 503, {
            "Retry-After": "30",
          }),
          protection.sessionCookie,
        ),
        "service_unavailable",
      );
    }
    return respond(
      withSession(
        meetingErrorResponse("schedule_failed", operationId, 502),
        protection.sessionCookie,
      ),
      "schedule_failed",
    );
  }
}

async function releaseBestEffort(
  releaseLock: MeetingsDependencies["release"],
  key: string,
  owner: string | false,
  telemetry: MeetingsTelemetry,
) {
  try {
    await releaseLock(key, owner);
  } catch (error) {
    const details = safeErrorDetails(error);
    telemetry.cleanup ??= { lock_release_failures: 0 };
    telemetry.cleanup.lock_release_failures += 1;
    telemetry.cleanup.first_error ??= details;
  }
}

function meetingErrorResponse(
  code: MeetingErrorCode,
  operationId: string,
  status: number,
  headers?: HeadersInit,
) {
  return Response.json(
    { error: { code, operationId } } satisfies MeetingErrorPayload,
    { status, headers },
  );
}

function protectionErrorCode(status: number): MeetingErrorCode {
  if (status === 403) {
    return "request_denied";
  }
  if (status === 429) {
    return "rate_limited";
  }
  return "service_unavailable";
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

export const POST = createMeetingsPost();
