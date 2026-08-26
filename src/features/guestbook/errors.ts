import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionary";

export const GUESTBOOK_ERROR_CODES = [
  "content_rejected",
  "invalid_request",
  "invalid_submission",
  "location_unavailable",
  "publish_failed",
  "rate_limited",
  "request_denied",
  "service_unavailable",
] as const;

export const GuestbookErrorCodeSchema = z.enum(GUESTBOOK_ERROR_CODES);

export const GuestbookErrorPayloadSchema = z.object({
  error: z.object({
    code: GuestbookErrorCodeSchema,
    operationId: z.string().min(1),
  }),
});

export type GuestbookErrorCode = z.infer<typeof GuestbookErrorCodeSchema>;
export type GuestbookErrorPayload = z.infer<typeof GuestbookErrorPayloadSchema>;

export function parseGuestbookErrorCode(value: unknown) {
  const parsed = GuestbookErrorPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data.error.code : undefined;
}

export function guestbookErrorMessage(
  code: GuestbookErrorCode | undefined,
  dictionary: Dictionary["guestbook"]["form"],
) {
  switch (code) {
    case "content_rejected":
      return dictionary.contentRejected;
    case "location_unavailable":
      return dictionary.locationUnavailable;
    case "rate_limited":
      return dictionary.rateLimited;
    case "request_denied":
      return dictionary.requestDenied;
    case "service_unavailable":
      return dictionary.serviceUnavailable;
    default:
      return dictionary.unableToPublish;
  }
}
