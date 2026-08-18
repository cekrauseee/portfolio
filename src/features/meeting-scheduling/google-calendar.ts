import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";

type CalendarConfig = {
  calendarId: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function calendarClient() {
  const auth = new google.auth.OAuth2(
    requiredEnv("GOOGLE_CLIENT_ID"),
    requiredEnv("GOOGLE_CLIENT_SECRET"),
  );
  auth.setCredentials({ refresh_token: requiredEnv("GOOGLE_REFRESH_TOKEN") });
  return google.calendar({ version: "v3", auth });
}

export function getCalendarConfig(): CalendarConfig {
  return { calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary" };
}

export async function hasCalendarConflict(
  start: Date,
  end: Date,
  config = getCalendarConfig(),
) {
  const response = await calendarClient().freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: config.calendarId }],
    },
  });
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
  config?: CalendarConfig;
}) {
  const config = input.config ?? getCalendarConfig();
  const meetingOwnerName = ownerName();
  const event: calendar_v3.Schema$Event = {
    summary: `${meetingOwnerName} and ${input.name}`,
    description: [
      `Hi ${input.name},`,
      "",
      `Thanks for scheduling a conversation with ${meetingOwnerName}.`,
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
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };
  const calendar = calendarClient();
  const response = await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: "all",
  });
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
        calendarLink: currentEvent.htmlLink,
      };
    }
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const polled = await calendar.events.get({
          calendarId: config.calendarId,
          eventId: response.data.id,
        });
        currentEvent = polled.data;
      } catch {
        break;
      }
    }
  }
  return {
    id: currentEvent.id,
    meetLink: currentEvent.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri,
    calendarLink: currentEvent.htmlLink,
  };
}

function ownerName() {
  return process.env.MEETING_OWNER_NAME?.trim() || "Henrique Krause";
}
