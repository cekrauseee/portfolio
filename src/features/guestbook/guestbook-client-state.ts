import type { GuestbookMessage } from "@/features/guestbook/contract";

export type GuestbookSubmissionState = {
  fingerprint: string;
  id: string;
};

export function appendUniqueMessages(
  current: GuestbookMessage[],
  incoming: GuestbookMessage[],
) {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    messages.set(message.id, message);
  }
  return [...messages.values()].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );
}

export function prependUniqueMessage(
  current: GuestbookMessage[],
  message: GuestbookMessage,
) {
  return appendUniqueMessages(current, [message]);
}

export function resolveGuestbookSubmission(
  name: string,
  message: string,
  current: GuestbookSubmissionState | undefined,
  createId: () => string = () => crypto.randomUUID(),
) {
  const fingerprint = JSON.stringify([name, message]);
  if (current?.fingerprint === fingerprint) {
    return current;
  }
  return { fingerprint, id: createId() };
}
