import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { createHash } from "node:crypto";
import { site } from "@/config/site";

export const CALENDAR_REQUEST_TIMEOUT_MS = 20_000;

type CalendarEnvironment = Record<string, string | undefined>;

type CalendarConfig = {
  calendarId: string;
};

type CalendarRuntimeConfiguration = CalendarConfig & {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type CalendarClient = ReturnType<typeof google.calendar>;
let calendarClientOverride: CalendarClient | undefined;

export type MeetingOperation = {
  idempotencyDigest: string;
  requestDigest: string;
};

type MeetingEventInput = {
  email: string;
  start: Date;
  end: Date;
  operation: MeetingOperation;
  config?: CalendarConfig;
};

export type MeetingEventLookup =
  | { status: "not-found"; eventId: string }
  | {
      status: "cancelled";
      eventId: string;
      data: calendar_v3.Schema$Event;
    }
  | { status: "mismatch"; eventId: string }
  | { status: "match"; eventId: string; data: calendar_v3.Schema$Event };

export class CalendarConfigurationError extends Error {
  constructor(message = "Google Calendar is not configured correctly.") {
    super(message);
    this.name = "CalendarConfigurationError";
  }
}

export class MeetingEventMismatchError extends Error {}

const EVENT_METADATA = {
  application: "portfolio-meeting",
  schema: "1",
} as const;

const EVENT_METADATA_KEYS = {
  application: "portfolioApplication",
  schema: "portfolioSchema",
  idempotency: "portfolioIdempotency",
  request: "portfolioRequest",
} as const;

const requestOptions = { timeout: CALENDAR_REQUEST_TIMEOUT_MS } as const;

/** Replace Google Calendar with a deterministic client in tests. */
export function setCalendarClientForTests(client?: CalendarClient) {
  calendarClientOverride = client;
}

export function validateCalendarConfiguration(
  environment: CalendarEnvironment = process.env,
): CalendarRuntimeConfiguration {
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = environment.GOOGLE_REFRESH_TOKEN?.trim();
  const missing = [
    ["GOOGLE_CLIENT_ID", clientId],
    ["GOOGLE_CLIENT_SECRET", clientSecret],
    ["GOOGLE_REFRESH_TOKEN", refreshToken],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new CalendarConfigurationError(
      `Missing Google Calendar configuration: ${missing.join(", ")}.`,
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    refreshToken: refreshToken!,
    calendarId: environment.GOOGLE_CALENDAR_ID?.trim() || "primary",
  };
}

function calendarClient() {
  if (calendarClientOverride) {
    return calendarClientOverride;
  }
  const configuration = validateCalendarConfiguration();
  const auth = new google.auth.OAuth2(
    configuration.clientId,
    configuration.clientSecret,
  );
  auth.setCredentials({ refresh_token: configuration.refreshToken });
  return google.calendar({ version: "v3", auth });
}

export function getCalendarConfig(): CalendarConfig {
  return { calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary" };
}

export function meetingEventId(start: Date, config = getCalendarConfig()) {
  return createHash("sha256")
    .update(`${config.calendarId}:${start.toISOString()}`)
    .digest("hex")
    .slice(0, 32);
}

export function meetingEventMetadata(operation: MeetingOperation) {
  return {
    [EVENT_METADATA_KEYS.application]: EVENT_METADATA.application,
    [EVENT_METADATA_KEYS.schema]: EVENT_METADATA.schema,
    [EVENT_METADATA_KEYS.idempotency]: operation.idempotencyDigest,
    [EVENT_METADATA_KEYS.request]: operation.requestDigest,
  };
}

/**
 * Look up the event that owns a deterministic meeting slot. A Google 404 is
 * deliberately treated as an ordinary miss; all other upstream failures are
 * allowed to reach the route's generic upstream-error handling.
 */
export async function findMeetingEvent(
  input: MeetingEventInput,
): Promise<MeetingEventLookup> {
  const config = input.config ?? getCalendarConfig();
  const eventId = meetingEventId(input.start, config);
  let response: { data: calendar_v3.Schema$Event };
  try {
    response = await calendarClient().events.get(
      {
        calendarId: config.calendarId,
        eventId,
      },
      requestOptions,
    );
  } catch (error) {
    if (isGoogleNotFound(error)) {
      return { status: "not-found", eventId };
    }
    throw error;
  }

  if (response.data.status === "cancelled") {
    return { status: "cancelled", eventId, data: response.data };
  }
  if (!matchesMeetingEvent(response.data, input, eventId)) {
    return { status: "mismatch", eventId };
  }
  return { status: "match", eventId, data: response.data };
}

export async function findMeetingEventWithRetry(input: MeetingEventInput) {
  let result = await findMeetingEvent(input);
  if (result.status === "not-found") {
    // Calendar writes can become visible to freeBusy before events.get. Give
    // the event index one short opportunity to catch up after a conflict.
    await new Promise((resolve) => setTimeout(resolve, 50));
    result = await findMeetingEvent(input);
  }
  return result;
}

export async function hasCalendarConflict(
  start: Date,
  end: Date,
  config = getCalendarConfig(),
) {
  const response = await calendarClient().freebusy.query(
    {
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: config.calendarId }],
      },
    },
    requestOptions,
  );
  const busy = response.data.calendars?.[config.calendarId]?.busy ?? [];
  const calendarErrors = response.data.calendars?.[config.calendarId]?.errors;
  if (calendarErrors?.length) {
    throw new Error("Google Calendar freeBusy returned an error.");
  }
  return busy.some((period) => {
    const busyStart = period.start ? Date.parse(period.start) : NaN;
    const busyEnd = period.end ? Date.parse(period.end) : NaN;
    return (
      Number.isFinite(busyStart) &&
      Number.isFinite(busyEnd) &&
      busyStart < end.getTime() &&
      busyEnd > start.getTime()
    );
  });
}

export async function createMeetingEvent(input: {
  name: string;
  email: string;
  start: Date;
  end: Date;
  timeZone: string;
  operation: MeetingOperation;
  config?: CalendarConfig;
}) {
  const config = input.config ?? getCalendarConfig();
  const deterministicId = meetingEventId(input.start, config);
  const event: calendar_v3.Schema$Event = {
    summary: `${site.name} and ${input.name}`,
    description: [
      `Hi ${input.name},`,
      "",
      `Thanks for scheduling a conversation with ${site.name}.`,
      "",
      "The conversation is scheduled for one hour.",
      "",
      "Use the Google Meet link in this event to join.",
    ].join("\n"),
    start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
    end: { dateTime: input.end.toISOString(), timeZone: input.timeZone },
    visibility: "private",
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: false,
    attendees: [{ email: input.email }],
    extendedProperties: {
      private: meetingEventMetadata(input.operation),
    },
    conferenceData: {
      createRequest: {
        requestId: `meeting-${deterministicId}-${input.operation.idempotencyDigest.slice(0, 16)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const calendar = calendarClient();
  let response: { data: calendar_v3.Schema$Event };
  let replayed = false;
  try {
    response = await calendar.events.insert(
      {
        calendarId: config.calendarId,
        requestBody: { ...event, id: deterministicId },
        conferenceDataVersion: 1,
        sendUpdates: "all",
      },
      requestOptions,
    );
  } catch (error) {
    if (!isGoogleConflict(error)) {
      throw error;
    }

    const existing = await findMeetingEventWithRetry(input);
    if (existing.status === "match") {
      response = { data: existing.data };
      replayed = true;
    } else if (existing.status === "cancelled") {
      // A cancelled deterministic event is never replayed. Restore its organizer
      // copy as a fresh booking and overwrite the operation metadata.
      response = await calendar.events.update(
        {
          calendarId: config.calendarId,
          eventId: deterministicId,
          requestBody: {
            ...event,
            status: "confirmed",
          },
          conferenceDataVersion: 1,
          sendUpdates: "all",
        },
        requestOptions,
      );
    } else {
      throw new MeetingEventMismatchError(
        "Google returned a conflicting event for this meeting.",
      );
    }
  }

  if (!response.data.id) {
    throw new Error("Google did not return an event id.");
  }

  let currentEvent = response.data;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const meetLink = currentEvent.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri;
    if (meetLink) {
      return {
        id: currentEvent.id,
        meetLink,
        calendarLink: currentEvent.htmlLink ?? undefined,
        replayed,
      };
    }
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const polled = await calendar.events.get(
          {
            calendarId: config.calendarId,
            eventId: response.data.id,
          },
          requestOptions,
        );
        currentEvent = polled.data;
      } catch (error) {
        if (!isGoogleNotFound(error)) {
          throw error;
        }
        break;
      }
    }
  }

  return {
    id: currentEvent.id,
    meetLink:
      currentEvent.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === "video",
      )?.uri ?? undefined,
    calendarLink: currentEvent.htmlLink ?? undefined,
    replayed,
  };
}

function matchesMeetingEvent(
  event: calendar_v3.Schema$Event,
  input: MeetingEventInput,
  eventId: string,
) {
  const eventStart = event.start?.dateTime
    ? Date.parse(event.start.dateTime)
    : NaN;
  const eventEnd = event.end?.dateTime ? Date.parse(event.end.dateTime) : NaN;
  const attendee = normalizeEmail(input.email);
  const metadata = event.extendedProperties?.private;
  const expectedMetadata = meetingEventMetadata(input.operation);

  return (
    event.status !== "cancelled" &&
    event.id === eventId &&
    eventStart === input.start.getTime() &&
    eventEnd === input.end.getTime() &&
    (event.attendees ?? []).some(
      (candidate) => normalizeEmail(candidate.email) === attendee,
    ) &&
    Object.entries(expectedMetadata).every(
      ([key, value]) => metadata?.[key] === value,
    )
  );
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function isGoogleNotFound(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const value = error as {
    code?: number | string;
    status?: number | string;
    statusCode?: number | string;
    response?: { status?: number | string };
  };
  return [
    value.code,
    value.status,
    value.statusCode,
    value.response?.status,
  ].some((candidate) => Number(candidate) === 404);
}

function isGoogleConflict(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const value = error as {
    code?: number | string;
    status?: number | string;
    statusCode?: number | string;
    response?: { status?: number | string };
  };
  return [
    value.code,
    value.status,
    value.statusCode,
    value.response?.status,
  ].some((candidate) => Number(candidate) === 409);
}
