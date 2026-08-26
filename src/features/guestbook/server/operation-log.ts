import type { ProtectionDiagnostic } from "@/lib/abuse-protection";
import { logger } from "@/lib/logger";
import type { SafeErrorDetails } from "@/lib/safe-error";

export type GuestbookOperationStage =
  | "protection"
  | "request"
  | "validation"
  | "location"
  | "configuration"
  | "moderation"
  | "persistence"
  | "complete";

export type GuestbookOperationOutcome =
  | "content_rejected"
  | "failed"
  | "invalid_request"
  | "invalid_submission"
  | "location_unavailable"
  | "published"
  | "rate_limited"
  | "request_denied"
  | "service_unavailable";

export type GuestbookOperationEvent = {
  event: "guestbook_submission";
  operation_id: string;
  request_id?: string;
  route: string;
  method: string;
  outcome: GuestbookOperationOutcome;
  stage: GuestbookOperationStage;
  http_status: number;
  duration_ms: number;
  location_source?: "device" | "vercel" | "unavailable";
  timings: {
    protection_ms?: number;
    request_ms?: number;
  };
  input?: {
    name_length: number;
    message_length: number;
  };
  protection?: ProtectionDiagnostic;
  moderation?: {
    outcome: "approved" | "rejected" | "failed";
    duration_ms: number;
    model: string;
    request_id?: string;
    failure?: SafeErrorDetails & { reason: string };
  };
  persistence?: {
    duration_ms: number;
    cache_invalidated?: boolean;
  };
  error?: SafeErrorDetails;
};

export function logGuestbookOperation(event: GuestbookOperationEvent) {
  const level =
    event.http_status >= 500
      ? "error"
      : event.http_status >= 400
        ? "warn"
        : "info";
  logger[level](event, "Guestbook submission completed");
}
