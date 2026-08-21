export const MAX_NAME_LENGTH = 60;
export const MAX_MESSAGE_LENGTH = 500;

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
};

export type GuestbookMessage = {
  id: string;
  name: string;
  message: string;
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
};

export type GuestbookSubmission = {
  name?: string;
  message?: string;
};

export function validateSubmission(body: unknown): GuestbookSubmission {
  if (!body || typeof body !== "object") {
    return {};
  }
  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : undefined;
  const message =
    typeof record.message === "string" ? record.message.trim() : undefined;

  const result: GuestbookSubmission = {};
  if (name && name.length <= MAX_NAME_LENGTH) {
    result.name = name;
  }
  if (message && message.length <= MAX_MESSAGE_LENGTH) {
    result.message = message;
  }
  return result;
}
