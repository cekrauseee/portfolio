import OpenAI from "openai";
import { safeErrorDetails } from "@/lib/safe-error";

export type OpenAIFailureReason =
  | "authentication"
  | "connection"
  | "rate_limited"
  | "timeout"
  | "upstream"
  | "unknown";

export function openAIFailureDetails(error: unknown) {
  const details = safeErrorDetails(error);
  return { ...details, reason: openAIFailureReason(error, details) };
}

function openAIFailureReason(
  error: unknown,
  details: ReturnType<typeof safeErrorDetails>,
): OpenAIFailureReason {
  if (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    details.kind === "APIConnectionTimeoutError"
  ) {
    return "timeout";
  }
  if (
    error instanceof OpenAI.RateLimitError ||
    details.kind === "RateLimitError" ||
    details.status === 429
  ) {
    return "rate_limited";
  }
  if (
    error instanceof OpenAI.AuthenticationError ||
    details.kind === "AuthenticationError" ||
    details.status === 401
  ) {
    return "authentication";
  }
  if (
    error instanceof OpenAI.APIConnectionError ||
    details.kind === "APIConnectionError"
  ) {
    return "connection";
  }
  if (error instanceof OpenAI.APIError || details.status !== undefined) {
    return "upstream";
  }
  return "unknown";
}
