import {
  assessRoleFit,
  parseRoleDescription,
  ROLE_FIT_MODEL,
  ROLE_FIT_REQUEST_TIMEOUT_MS,
} from "@/features/role-fit/assess-role-fit";
import type { FitErrorCode, FitErrorPayload } from "@/features/role-fit/errors";
import {
  guardRoleDescription,
  ROLE_FIT_GUARDRAIL_MODEL,
  ROLE_FIT_GUARDRAIL_TIMEOUT_MS,
  type RoleFitGuardrailResult,
} from "@/features/role-fit/guard-role-description";
import {
  acquire,
  protect,
  ProtectionUnavailableError,
  readJson,
  release,
  withSession,
  type ProtectionDiagnostic,
} from "@/lib/abuse-protection";
import { openAIFailureDetails } from "@/lib/openai-error";
import {
  createOperationEvent,
  writeOperationEvent,
  type OperationEventWriter,
} from "@/lib/operation-event";
import { safeErrorDetails, type SafeErrorDetails } from "@/lib/safe-error";

export const runtime = "nodejs";

export const ROLE_FIT_OPERATION_TIMEOUT_MS =
  ROLE_FIT_GUARDRAIL_TIMEOUT_MS + ROLE_FIT_REQUEST_TIMEOUT_MS;
const LOCK_TTL_SECONDS = Math.ceil(ROLE_FIT_OPERATION_TIMEOUT_MS / 1_000) + 30;

type FitDependencies = {
  protect: typeof protect;
  readJson: typeof readJson;
  acquire: typeof acquire;
  release: typeof release;
  guardRoleDescription: typeof guardRoleDescription;
  assessRoleFit: typeof assessRoleFit;
  logOperation: OperationEventWriter;
};

const defaultDependencies: FitDependencies = {
  protect,
  readJson,
  acquire,
  release,
  guardRoleDescription,
  assessRoleFit,
  logOperation: writeOperationEvent,
};

export function createFitPost(overrides: Partial<FitDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function POST(request: Request) {
    const operation = createOperationEvent(
      request,
      "fit_assessment",
      dependencies.logOperation,
    );
    let stage = "protection";
    let protectionDiagnostic: ProtectionDiagnostic | undefined;
    let sessionCookie: string | undefined;
    let input: { description_length: number } | undefined;
    let lock:
      { acquired: boolean; release_error?: SafeErrorDetails } | undefined;
    let assessment:
      | {
          outcome: "completed" | "failed";
          duration_ms: number;
          model: string;
          request_id?: string;
          failure?: ReturnType<typeof openAIFailureDetails>;
        }
      | undefined;
    let guardrail:
      | {
          outcome: "approved" | "failed" | "rejected";
          duration_ms: number;
          model: string;
          request_id?: string;
          failure?: Extract<
            RoleFitGuardrailResult,
            { status: "failed" }
          >["failure"];
        }
      | undefined;

    const errorResponse = (
      code: FitErrorCode,
      status: number,
      headers?: HeadersInit,
      sessionCookie?: string,
    ) =>
      withSession(
        Response.json(
          {
            error: { code, operationId: operation.operationId },
          } satisfies FitErrorPayload,
          { status, headers },
        ),
        sessionCookie,
      );

    const complete = (response: Response, outcome: string, error?: unknown) =>
      operation.complete(response, {
        outcome,
        stage,
        protection: protectionDiagnostic,
        input,
        lock,
        guardrail,
        assessment,
        error: error === undefined ? undefined : safeErrorDetails(error),
      });

    try {
      const protection = await dependencies.protect(
        "fit",
        request,
        (diagnostic) => {
          protectionDiagnostic = diagnostic;
        },
      );
      if (protection instanceof Response) {
        const code = protectionErrorCode(protection.status);
        return complete(
          errorResponse(code, protection.status, protection.headers),
          code,
        );
      }
      sessionCookie = protection.sessionCookie;

      stage = "request";
      const parsed = await dependencies.readJson(request, "fit");
      if (parsed.response) {
        return complete(
          errorResponse(
            "invalid_description",
            parsed.response.status,
            parsed.response.headers,
            protection.sessionCookie,
          ),
          "invalid_description",
        );
      }

      stage = "validation";
      const description = parseRoleDescription(parsed.body);
      if (!description) {
        return complete(
          errorResponse(
            "invalid_description",
            400,
            undefined,
            protection.sessionCookie,
          ),
          "invalid_description",
        );
      }
      input = { description_length: description.length };

      stage = "configuration";
      if (!process.env.OPENAI_API_KEY?.trim()) {
        return complete(
          errorResponse(
            "service_unavailable",
            503,
            undefined,
            protection.sessionCookie,
          ),
          "service_unavailable",
        );
      }

      stage = "lock";
      const lockKey = `fit:${protection.identity}`;
      const lockOwner = await dependencies.acquire(lockKey, LOCK_TTL_SECONDS);
      lock = { acquired: Boolean(lockOwner) };
      if (!lockOwner) {
        return complete(
          errorResponse(
            "rate_limited",
            429,
            { "Retry-After": "30" },
            protection.sessionCookie,
          ),
          "rate_limited",
        );
      }

      let response: Response;
      let outcome: string;
      try {
        stage = "guardrail";
        const guardrailStartedAt = Date.now();
        const guardrailResult = await dependencies.guardRoleDescription(
          description,
          protection.identity,
        );
        const guardrailDurationMs = Date.now() - guardrailStartedAt;

        if (guardrailResult.status === "failed") {
          guardrail = {
            outcome: "failed",
            duration_ms: guardrailDurationMs,
            model: ROLE_FIT_GUARDRAIL_MODEL,
            request_id: guardrailResult.failure.request_id,
            failure: guardrailResult.failure,
          };
          response = errorResponse(
            "service_unavailable",
            503,
            { "Retry-After": "30" },
            protection.sessionCookie,
          );
          outcome = "service_unavailable";
        } else if (guardrailResult.status === "rejected") {
          guardrail = {
            outcome: "rejected",
            duration_ms: guardrailDurationMs,
            model: ROLE_FIT_GUARDRAIL_MODEL,
            request_id: guardrailResult.requestId,
          };
          response = errorResponse(
            "description_rejected",
            422,
            undefined,
            protection.sessionCookie,
          );
          outcome = "description_rejected";
        } else {
          guardrail = {
            outcome: "approved",
            duration_ms: guardrailDurationMs,
            model: ROLE_FIT_GUARDRAIL_MODEL,
            request_id: guardrailResult.requestId,
          };

          stage = "assessment";
          const assessmentStartedAt = Date.now();
          try {
            const result = await dependencies.assessRoleFit(
              description,
              protection.identity,
            );
            assessment = {
              outcome: "completed",
              duration_ms: Date.now() - assessmentStartedAt,
              model: ROLE_FIT_MODEL,
              request_id: result.requestId,
            };
            response = withSession(
              Response.json({ answer: result.answer }),
              protection.sessionCookie,
            );
            outcome = "completed";
          } catch (error) {
            assessment = {
              outcome: "failed",
              duration_ms: Date.now() - assessmentStartedAt,
              model: ROLE_FIT_MODEL,
              failure: openAIFailureDetails(error),
            };
            response = errorResponse(
              "assessment_failed",
              502,
              undefined,
              protection.sessionCookie,
            );
            outcome = "assessment_failed";
          }
        }
      } finally {
        const releaseError = await releaseBestEffort(
          dependencies.release,
          lockKey,
          lockOwner,
        );
        if (releaseError) {
          lock.release_error = releaseError;
        }
      }
      return complete(response, outcome);
    } catch (error) {
      if (error instanceof ProtectionUnavailableError) {
        return complete(
          errorResponse(
            "service_unavailable",
            503,
            { "Retry-After": "30" },
            sessionCookie,
          ),
          "service_unavailable",
          error,
        );
      }
      return complete(
        errorResponse("assessment_failed", 502, undefined, sessionCookie),
        "failed",
        error,
      );
    }
  };
}

async function releaseBestEffort(
  releaseLock: FitDependencies["release"],
  key: string,
  owner: string | false,
) {
  try {
    await releaseLock(key, owner);
    return undefined;
  } catch (error) {
    return safeErrorDetails(error);
  }
}

function protectionErrorCode(status: number): FitErrorCode {
  if (status === 403) {
    return "request_denied";
  }
  if (status === 429) {
    return "rate_limited";
  }
  return "service_unavailable";
}

export const POST = createFitPost();
