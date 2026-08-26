import { randomUUID } from "node:crypto";
import {
  protect,
  readJson,
  withSession,
  type ProtectionDiagnostic,
} from "@/lib/abuse-protection";
import { safeErrorDetails } from "@/lib/safe-error";
import type {
  GuestbookErrorCode,
  GuestbookErrorPayload,
} from "@/features/guestbook/errors";
import { validateSubmission } from "@/features/guestbook/message";
import { createMessage } from "@/features/guestbook/server/db/client";
import { resolveGeo } from "@/features/guestbook/server/geo";
import {
  MODERATION_MODEL,
  moderateMessage,
} from "@/features/guestbook/server/moderate-message";
import {
  logGuestbookOperation,
  type GuestbookOperationEvent,
  type GuestbookOperationOutcome,
  type GuestbookOperationStage,
} from "@/features/guestbook/server/operation-log";

export type GuestbookDependencies = {
  protect: typeof protect;
  readJson: typeof readJson;
  moderateMessage: typeof moderateMessage;
  resolveGeo: typeof resolveGeo;
  createMessage: typeof createMessage;
  logOperation: typeof logGuestbookOperation;
};

const defaultDependencies: GuestbookDependencies = {
  protect,
  readJson,
  moderateMessage,
  resolveGeo,
  createMessage,
  logOperation: logGuestbookOperation,
};

export function createGuestbookPost(
  overrides: Partial<GuestbookDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function POST(request: Request) {
    const operationId = randomUUID();
    const startedAt = Date.now();
    const requestUrl = new URL(request.url);
    const requestId = vercelRequestId(request);
    let currentStage: GuestbookOperationStage = "protection";
    let protectionDiagnostic: ProtectionDiagnostic | undefined;
    let input: GuestbookOperationEvent["input"];
    let locationSource: GuestbookOperationEvent["location_source"];
    let moderation: GuestbookOperationEvent["moderation"];
    let persistence: GuestbookOperationEvent["persistence"];
    const timings: GuestbookOperationEvent["timings"] = {};

    const complete = (
      response: Response,
      outcome: GuestbookOperationOutcome,
      stage: GuestbookOperationStage,
      error?: unknown,
    ) => {
      response.headers.set("X-Operation-Id", operationId);
      const event: GuestbookOperationEvent = {
        event: "guestbook_submission",
        operation_id: operationId,
        request_id: requestId || undefined,
        route: requestUrl.pathname,
        method: request.method,
        outcome,
        stage,
        http_status: response.status,
        duration_ms: Date.now() - startedAt,
        location_source: locationSource,
        timings,
        input,
        protection: protectionDiagnostic,
        moderation,
        persistence,
        error: error === undefined ? undefined : safeErrorDetails(error),
      };
      try {
        dependencies.logOperation(event);
      } catch (loggingError) {
        console.error(
          JSON.stringify({
            event: "guestbook_logging_failure",
            operation_id: operationId,
            error: safeErrorDetails(loggingError),
          }),
        );
      }
      return response;
    };

    const errorResponse = (
      code: GuestbookErrorCode,
      status: number,
      headers?: HeadersInit,
      sessionCookie?: string,
    ) =>
      withSession(
        Response.json(
          { error: { code, operationId } } satisfies GuestbookErrorPayload,
          { status, headers },
        ),
        sessionCookie,
      );

    try {
      // Preserve the deployed visitorGlobe protection bucket during the rename.
      const protectionStartedAt = Date.now();
      const protection = await dependencies.protect(
        "visitorGlobe",
        request,
        (diagnostic) => {
          protectionDiagnostic = diagnostic;
        },
      );
      timings.protection_ms = Date.now() - protectionStartedAt;
      if (protection instanceof Response) {
        const code = protectionErrorCode(protection.status);
        return complete(
          errorResponse(code, protection.status, protection.headers),
          protectionOutcome(code),
          currentStage,
        );
      }

      currentStage = "request";
      const requestStartedAt = Date.now();
      const parsed = await dependencies.readJson(request, "visitorGlobe");
      timings.request_ms = Date.now() - requestStartedAt;
      if (parsed.response) {
        return complete(
          errorResponse(
            parsed.response.status === 413
              ? "invalid_request"
              : "invalid_submission",
            parsed.response.status,
            parsed.response.headers,
            protection.sessionCookie,
          ),
          "invalid_request",
          currentStage,
        );
      }

      currentStage = "validation";
      const submission = validateSubmission(parsed.body);
      if (!submission.name || !submission.message) {
        return complete(
          errorResponse(
            "invalid_submission",
            400,
            undefined,
            protection.sessionCookie,
          ),
          "invalid_submission",
          currentStage,
        );
      }
      input = {
        name_length: submission.name.length,
        message_length: submission.message.length,
      };

      currentStage = "location";
      const geo = dependencies.resolveGeo(request, submission.location);
      locationSource = geo?.source ?? "unavailable";
      if (!geo) {
        return complete(
          errorResponse(
            "location_unavailable",
            503,
            undefined,
            protection.sessionCookie,
          ),
          "location_unavailable",
          currentStage,
        );
      }

      currentStage = "configuration";
      if (!process.env.OPENAI_API_KEY?.trim()) {
        return complete(
          errorResponse(
            "service_unavailable",
            503,
            undefined,
            protection.sessionCookie,
          ),
          "service_unavailable",
          currentStage,
        );
      }

      currentStage = "moderation";
      const moderationStartedAt = Date.now();
      const moderationResult = await dependencies.moderateMessage(
        submission.name,
        submission.message,
        protection.identity,
      );
      const moderationDurationMs = Date.now() - moderationStartedAt;

      if (moderationResult.status === "failed") {
        moderation = {
          outcome: "failed",
          duration_ms: moderationDurationMs,
          model: MODERATION_MODEL,
          request_id: moderationResult.failure.request_id,
          failure: moderationResult.failure,
        };
        return complete(
          errorResponse(
            "service_unavailable",
            503,
            { "Retry-After": "30" },
            protection.sessionCookie,
          ),
          "service_unavailable",
          currentStage,
        );
      }

      moderation = {
        outcome: moderationResult.status,
        duration_ms: moderationDurationMs,
        model: MODERATION_MODEL,
        request_id: moderationResult.requestId,
      };
      if (moderationResult.status === "rejected") {
        return complete(
          errorResponse(
            "content_rejected",
            422,
            undefined,
            protection.sessionCookie,
          ),
          "content_rejected",
          currentStage,
        );
      }

      currentStage = "persistence";
      const persistenceStartedAt = Date.now();
      try {
        const result = await dependencies.createMessage({
          name: submission.name,
          message: submission.message,
          latitude: geo.latitude,
          longitude: geo.longitude,
          country: geo.country,
          city: geo.city,
        });
        persistence = {
          duration_ms: Date.now() - persistenceStartedAt,
          cache_invalidated: result.cacheInvalidated,
        };
        return complete(
          withSession(
            Response.json({ ok: true }, { status: 201 }),
            protection.sessionCookie,
          ),
          "published",
          "complete",
        );
      } catch (error) {
        persistence = { duration_ms: Date.now() - persistenceStartedAt };
        return complete(
          errorResponse(
            "publish_failed",
            502,
            undefined,
            protection.sessionCookie,
          ),
          "failed",
          currentStage,
          error,
        );
      }
    } catch (error) {
      return complete(
        errorResponse("service_unavailable", 500),
        "failed",
        currentStage,
        error,
      );
    }
  };
}

function protectionErrorCode(status: number): GuestbookErrorCode {
  if (status === 403) {
    return "request_denied";
  }
  if (status === 429) {
    return "rate_limited";
  }
  return "service_unavailable";
}

function vercelRequestId(request: Request) {
  const value = request.headers.get("x-vercel-id")?.trim();
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

function protectionOutcome(
  code: GuestbookErrorCode,
): GuestbookOperationOutcome {
  if (code === "request_denied" || code === "rate_limited") {
    return code;
  }
  return "service_unavailable";
}
