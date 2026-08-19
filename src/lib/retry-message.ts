export function retryMessage(response: Response) {
  const retryAfter = response.headers.get("Retry-After")?.trim();
  if (!retryAfter || !/^\d+$/.test(retryAfter)) {
    return "Please wait a moment before trying again.";
  }
  const seconds = Number(retryAfter);
  if (!Number.isSafeInteger(seconds)) {
    return "Please wait a moment before trying again.";
  }
  return `Please wait ${retryAfter} second${seconds === 1 ? "" : "s"} before trying again.`;
}
