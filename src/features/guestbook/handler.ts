import {
  acquire,
  digest,
  protect,
  readJson,
  release,
  withSession,
} from "@/lib/abuse-protection";
import {
  createOperationEvent,
  writeOperationEvent,
} from "@/lib/operation-event";
import { safeErrorDetails } from "@/lib/safe-error";
import {
  decodeGuestbookCursor,
  GuestbookSubmissionSchema,
  type GuestbookErrorCode,
  type GuestbookSubmission,
} from "./contract";
import {
  guardGuestbookMessage,
  GUESTBOOK_GUARDRAIL_MODEL,
} from "./guard-message";
import { rememberedGuestbookName, rememberGuestbookName } from "./name-cookie";
import {
  findGuestbookSubmission,
  insertGuestbookMessage,
  listGuestbookMessages,
  publicGuestbookMessage,
  type StoredGuestbookMessage,
} from "./store";

const defaultDependencies = {
  protect,
  readJson,
  acquire,
  release,
  digest,
  guardGuestbookMessage,
  findGuestbookSubmission,
  insertGuestbookMessage,
  listGuestbookMessages,
  logOperation: writeOperationEvent,
};
type Dependencies = typeof defaultDependencies;

function privateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function createGuestbookGet(overrides: Partial<Dependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  return async (request: Request) => {
    const operation = createOperationEvent(
      request,
      "guestbook_read",
      dependencies.logOperation,
    );
    const value = new URL(request.url).searchParams.get("cursor");
    const cursor = value === null ? null : decodeGuestbookCursor(value);
    if (value !== null && !cursor) {
      return privateResponse(
        operation.complete(
          Response.json({ error: { code: "invalid_cursor" } }, { status: 400 }),
          { outcome: "invalid_cursor", stage: "validation" },
        ),
      );
    }
    try {
      const page = await dependencies.listGuestbookMessages(cursor);
      return privateResponse(
        operation.complete(
          Response.json({
            ...page,
            rememberedName: rememberedGuestbookName(request),
          }),
          { outcome: "completed", stage: "read", count: page.messages.length },
        ),
      );
    } catch (error) {
      return privateResponse(
        operation.complete(
          Response.json(
            {
              error: {
                code: "service_unavailable",
                operationId: operation.operationId,
              },
            },
            { status: 503 },
          ),
          { outcome: "failed", stage: "read", error: safeErrorDetails(error) },
        ),
      );
    }
  };
}

export function createGuestbookPost(overrides: Partial<Dependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  return async (request: Request) => {
    const operation = createOperationEvent(
      request,
      "guestbook_publish",
      dependencies.logOperation,
    );
    let stage = "origin";
    let sessionCookie: string | undefined;
    let lockOwner: string | false = false;
    let lockKey = "";
    const details: Record<string, unknown> = {};
    const errorResponse = (
      code: GuestbookErrorCode,
      status: number,
      headers?: HeadersInit,
    ) =>
      withSession(
        Response.json(
          { error: { code, operationId: operation.operationId } },
          { status, headers },
        ),
        sessionCookie,
      );
    const complete = (response: Response, outcome: string) =>
      privateResponse(
        operation.complete(response, { ...details, outcome, stage }),
      );
    const existingResponse = (
      row: StoredGuestbookMessage,
      input: GuestbookSubmission,
      status: number,
    ) => {
      if (row.name !== input.name || row.message !== input.message) {
        return errorResponse("submission_conflict", 409);
      }
      if (row.hiddenAt) {
        return errorResponse("message_rejected", 422);
      }
      return rememberGuestbookName(
        withSession(
          Response.json({ message: publicGuestbookMessage(row) }, { status }),
          sessionCookie,
        ),
        input.name,
      );
    };
    let response: Response;
    let outcome = "failed";
    try {
      const origin = request.headers.get("origin");
      if (
        (origin && origin !== new URL(request.url).origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      ) {
        return complete(errorResponse("request_denied", 403), "request_denied");
      }
      stage = "protection";
      const protection = await dependencies.protect(
        "guestbook",
        request,
        (diagnostic) => {
          details.protection = diagnostic;
        },
      );
      if (protection instanceof Response) {
        const code =
          protection.status === 403
            ? "request_denied"
            : protection.status === 429
              ? "rate_limited"
              : "service_unavailable";
        return complete(
          errorResponse(code, protection.status, protection.headers),
          code,
        );
      }
      sessionCookie = protection.sessionCookie;
      stage = "validation";
      const parsed = await dependencies.readJson(request, "guestbook");
      if (parsed.response) {
        return complete(
          errorResponse("invalid_message", parsed.response.status),
          "invalid_message",
        );
      }
      const result = GuestbookSubmissionSchema.safeParse(parsed.body);
      if (!result.success) {
        return complete(
          errorResponse("invalid_message", 400),
          "invalid_message",
        );
      }
      const input = result.data;
      details.input = {
        name_length: input.name.length,
        message_length: input.message.length,
      };
      const submissionKey = dependencies.digest(
        `guestbook-submission:${input.submissionId}`,
      );
      stage = "lookup";
      const existing =
        await dependencies.findGuestbookSubmission(submissionKey);
      if (existing) {
        const replay = existingResponse(existing, input, 200);
        return complete(replay, replay.ok ? "replayed" : "replay_rejected");
      }
      stage = "lock";
      lockKey = `guestbook:${protection.identity}`;
      lockOwner = await dependencies.acquire(lockKey, 60);
      if (!lockOwner) {
        return complete(
          errorResponse("rate_limited", 429, { "Retry-After": "30" }),
          "rate_limited",
        );
      }
      stage = "guardrail";
      const startedAt = Date.now();
      const guardrail = await dependencies.guardGuestbookMessage(
        input,
        protection.identity,
      );
      details.guardrail = {
        ...guardrail,
        model: GUESTBOOK_GUARDRAIL_MODEL,
        duration_ms: Date.now() - startedAt,
      };
      if (guardrail.status === "rejected") {
        response = errorResponse("message_rejected", 422);
        outcome = "message_rejected";
      } else if (guardrail.status === "failed") {
        response = errorResponse("service_unavailable", 503, {
          "Retry-After": "30",
        });
        outcome = "service_unavailable";
      } else {
        stage = "persist";
        const row = await dependencies.insertGuestbookMessage(
          input,
          submissionKey,
        );
        if (!row) {
          throw new Error("Guestbook insert returned no row.");
        }
        response = existingResponse(row, input, 201);
        outcome = response.ok ? "published" : "replay_rejected";
      }
    } catch (error) {
      details.error = safeErrorDetails(error);
      response = errorResponse("service_unavailable", 503, {
        "Retry-After": "30",
      });
    } finally {
      if (lockOwner) {
        try {
          await dependencies.release(lockKey, lockOwner);
        } catch (error) {
          details.lock_release_error = safeErrorDetails(error);
        }
      }
    }
    return complete(response, outcome);
  };
}
