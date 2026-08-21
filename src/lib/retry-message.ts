export type RetryCopy = {
  waitMoment: string;
  waitSeconds: string;
};

const defaultRetryCopy: RetryCopy = {
  waitMoment: "Please wait a moment before trying again.",
  waitSeconds: "Please wait {count} second{plural} before trying again.",
};

export function shouldUseRetryMessage(response: Response) {
  return (
    response.status === 429 ||
    (response.status === 503 && response.headers.has("Retry-After"))
  );
}

export function retryMessage(
  response: Response,
  copy: RetryCopy = defaultRetryCopy,
) {
  const retryAfter = response.headers.get("Retry-After")?.trim();
  if (!retryAfter || !/^\d+$/.test(retryAfter)) {
    return copy.waitMoment;
  }
  const seconds = Number(retryAfter);
  if (!Number.isSafeInteger(seconds)) {
    return copy.waitMoment;
  }
  return copy.waitSeconds
    .replace("{count}", retryAfter)
    .replace("{plural}", seconds === 1 ? "" : "s");
}
