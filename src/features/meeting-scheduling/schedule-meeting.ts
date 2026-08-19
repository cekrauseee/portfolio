import {
  createMeetingEvent,
  findMeetingEvent,
  findMeetingEventWithRetry,
  getCalendarConfig,
  hasCalendarConflict,
  type MeetingOperation,
  MeetingEventMismatchError,
} from "@/features/meeting-scheduling/google-calendar";
import { sendMeetingNotification } from "@/features/meeting-scheduling/meeting-notification";

export type { MeetingOperation };

export type MeetingRequest = {
  name: string;
  email: string;
  start: string;
  timeZone: string;
};

export class MeetingInputError extends Error {}
export class MeetingConflictError extends Error {}

export function validateMeetingRequest(body: unknown): MeetingRequest {
  if (!body || typeof body !== "object") {
    throw new MeetingInputError("Provide meeting details as JSON.");
  }
  const value = body as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const start = typeof value.start === "string" ? value.start.trim() : "";
  const timeZone =
    typeof value.timeZone === "string" ? value.timeZone.trim() : "";
  if (name.length < 2 || name.length > 120) {
    throw new MeetingInputError("Provide a valid name.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new MeetingInputError("Provide a valid email.");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00(?::00)?$/.test(start)) {
    throw new MeetingInputError("Start must be a local whole-hour time.");
  }
  if (!isTimeZone(timeZone)) {
    throw new MeetingInputError("Provide a valid IANA time zone.");
  }
  const [datePart, timePart] = start.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour] = timePart.split(":").map(Number);
  if (
    hour > 23 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  ) {
    throw new MeetingInputError("Provide a valid start time.");
  }
  const utcStart = localToUtc(start, timeZone);
  const now = Date.now();
  if (utcStart.getTime() <= now) {
    throw new MeetingInputError("Choose a future start time.");
  }
  return {
    name,
    email,
    start: `${datePart}T${timePart.length === 5 ? `${timePart}:00` : timePart}`,
    timeZone,
  };
}

export async function scheduleMeeting(
  request: MeetingRequest,
  operation: MeetingOperation,
) {
  validateMeetingOperation(operation);

  const startDate = localToUtc(request.start, request.timeZone);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const config = getCalendarConfig();
  const eventInput = {
    ...request,
    start: startDate,
    end: endDate,
    operation,
    config,
  };

  const existing = await findMeetingEvent(eventInput);
  if (existing.status === "mismatch") {
    throw new MeetingConflictError("That time is no longer available.");
  }
  if (existing.status === "match") {
    return {
      id: existing.data.id,
      meetLink:
        existing.data.conferenceData?.entryPoints?.find(
          (entry) => entry.entryPointType === "video",
        )?.uri ?? undefined,
      calendarLink: existing.data.htmlLink ?? undefined,
      replayed: true,
    };
  }
  // Cancelled events are deliberately not replayed. Creation restores the
  // deterministic organizer event as a fresh booking after conflict checking.

  if (await hasCalendarConflict(startDate, endDate, config)) {
    const recovered = await findMeetingEventWithRetry(eventInput);
    if (recovered.status === "match") {
      return {
        id: recovered.data.id,
        meetLink:
          recovered.data.conferenceData?.entryPoints?.find(
            (entry) => entry.entryPointType === "video",
          )?.uri ?? undefined,
        calendarLink: recovered.data.htmlLink ?? undefined,
        replayed: true,
      };
    }
    throw new MeetingConflictError("That time is no longer available.");
  }

  let event;
  try {
    event = await createMeetingEvent(eventInput);
  } catch (error) {
    if (error instanceof MeetingEventMismatchError) {
      throw new MeetingConflictError("That time is no longer available.");
    }
    throw error;
  }
  if (event.replayed) {
    return event;
  }

  try {
    await sendMeetingNotification({
      ...request,
      start: startDate,
      meetLink: event.meetLink ?? undefined,
      calendarLink: event.calendarLink ?? undefined,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "meeting_owner_notification_failure",
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
  return event;
}

export function meetingUtcSlot(request: MeetingRequest) {
  return localToUtc(request.start, request.timeZone).toISOString();
}

function validateMeetingOperation(operation: MeetingOperation | undefined) {
  if (
    !operation ||
    !/^[a-f0-9]{64}$/.test(operation.idempotencyDigest) ||
    !/^[a-f0-9]{64}$/.test(operation.requestDigest)
  ) {
    throw new Error("A valid meeting operation identity is required.");
  }
}

function isTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function localToUtc(local: string, timeZone: string) {
  const [date, clock] = local.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = clock.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const offsets = new Set<number>();
  for (let delta = -48 * 60; delta <= 48 * 60; delta += 60) {
    const instant = localAsUtc + delta * 60_000;
    const shown = dateParts(formatter, instant);
    offsets.add(
      Date.UTC(
        shown.year,
        shown.month - 1,
        shown.day,
        shown.hour,
        shown.minute,
        shown.second,
      ) - instant,
    );
  }
  const candidates = [...offsets]
    .map((offset) => new Date(localAsUtc - offset))
    .filter((candidate) => {
      const shown = dateParts(formatter, candidate.getTime());
      return (
        shown.year === year &&
        shown.month === month &&
        shown.day === day &&
        shown.hour === hour &&
        shown.minute === minute &&
        shown.second === second
      );
    })
    .sort((left, right) => left.getTime() - right.getTime());
  if (!candidates.length) {
    throw new MeetingInputError(
      "That local time does not exist in this time zone. Choose another time.",
    );
  }
  return candidates[0];
}

function dateParts(formatter: Intl.DateTimeFormat, instant: number) {
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return { ...values, hour: values.hour % 24 } as Record<string, number>;
}
