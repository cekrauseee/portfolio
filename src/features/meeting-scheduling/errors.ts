import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionary";

export const MEETING_ERROR_CODES = [
  "conflict",
  "invalid_meeting",
  "rate_limited",
  "request_denied",
  "schedule_failed",
  "service_unavailable",
] as const;

export const MeetingErrorCodeSchema = z.enum(MEETING_ERROR_CODES);

export const MeetingErrorPayloadSchema = z.object({
  error: z.object({
    code: MeetingErrorCodeSchema,
    operationId: z.string().min(1),
  }),
});

export type MeetingErrorCode = z.infer<typeof MeetingErrorCodeSchema>;
export type MeetingErrorPayload = z.infer<typeof MeetingErrorPayloadSchema>;

export function parseMeetingErrorCode(value: unknown) {
  const parsed = MeetingErrorPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data.error.code : undefined;
}

export function meetingErrorMessage(
  code: MeetingErrorCode | undefined,
  dictionary: Dictionary["schedule"]["form"],
) {
  switch (code) {
    case "conflict":
      return dictionary.conflict;
    case "rate_limited":
      return dictionary.rateLimited;
    case "request_denied":
      return dictionary.requestDenied;
    case "service_unavailable":
      return dictionary.serviceUnavailable;
    default:
      return dictionary.unableToSchedule;
  }
}
