import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionary";

export const FIT_ERROR_CODES = [
  "assessment_failed",
  "description_rejected",
  "invalid_description",
  "rate_limited",
  "request_denied",
  "service_unavailable",
] as const;

export const FitErrorCodeSchema = z.enum(FIT_ERROR_CODES);

export const FitErrorPayloadSchema = z.object({
  error: z.object({
    code: FitErrorCodeSchema,
    operationId: z.string().min(1),
  }),
});

export type FitErrorCode = z.infer<typeof FitErrorCodeSchema>;
export type FitErrorPayload = z.infer<typeof FitErrorPayloadSchema>;

export function parseFitErrorCode(value: unknown) {
  const parsed = FitErrorPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data.error.code : undefined;
}

export function fitErrorMessage(
  code: FitErrorCode | undefined,
  dictionary: Dictionary["fit"]["form"],
) {
  switch (code) {
    case "rate_limited":
      return dictionary.rateLimited;
    case "request_denied":
      return dictionary.requestDenied;
    case "service_unavailable":
      return dictionary.serviceUnavailable;
    default:
      return dictionary.unableToAssess;
  }
}
