import { randomUUID } from "node:crypto";
import { logger } from "@/lib/logger";
import { safeErrorDetails } from "@/lib/safe-error";

export type OperationEvent = {
  event: string;
  operation_id: string;
  request_id?: string;
  route: string;
  method: string;
  outcome: string;
  stage: string;
  http_status: number;
  duration_ms: number;
  [key: string]: unknown;
};

export type OperationEventWriter = (event: OperationEvent) => void;

export function createOperationEvent(
  request: Request,
  eventName: string,
  write: OperationEventWriter = writeOperationEvent,
) {
  const operationId = randomUUID();
  const startedAt = Date.now();
  const requestUrl = new URL(request.url);
  const requestId = vercelRequestId(request);

  return {
    operationId,
    complete(
      response: Response,
      fields: { outcome: string; stage: string; [key: string]: unknown },
    ) {
      response.headers.set("X-Operation-Id", operationId);
      const event: OperationEvent = {
        event: eventName,
        operation_id: operationId,
        request_id: requestId,
        route: requestUrl.pathname,
        method: request.method,
        http_status: response.status,
        duration_ms: Date.now() - startedAt,
        ...fields,
        outcome: fields.outcome,
        stage: fields.stage,
      };
      try {
        write(event);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "operation_logging_failure",
            operation_id: operationId,
            error: safeErrorDetails(error),
          }),
        );
      }
      return response;
    },
  };
}

export function writeOperationEvent(event: OperationEvent) {
  const level =
    event.http_status >= 500
      ? "error"
      : event.http_status >= 400
        ? "warn"
        : "info";
  logger[level](event, "Operation completed");
}

function vercelRequestId(request: Request) {
  const value = request.headers.get("x-vercel-id")?.trim();
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}
