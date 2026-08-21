import { Resend } from "resend";
import { site } from "@/config/site";

export const MEETING_NOTIFICATION_TIMEOUT_MS = 10_000;

type NotificationEnvironment = Record<string, string | undefined>;

export type MeetingNotificationConfiguration = {
  apiKey: string;
  to: string;
  from: string;
};

type MeetingNotificationInput = {
  name: string;
  email: string;
  start: Date;
  timeZone: string;
  meetLink?: string;
  calendarLink?: string;
};

type MeetingNotificationOptions = {
  idempotencyKey: string;
  configuration?: MeetingNotificationConfiguration;
};

type MeetingNotification = (
  input: MeetingNotificationInput,
  options: MeetingNotificationOptions,
) => Promise<unknown>;

export class MeetingNotificationConfigurationError extends Error {
  constructor(message = "Meeting notification is not configured correctly.") {
    super(message);
    this.name = "MeetingNotificationConfigurationError";
  }
}

let notificationOverride: MeetingNotification | undefined;

/** Replace Resend delivery with a deterministic notifier in tests. */
export function setMeetingNotificationForTests(notifier?: MeetingNotification) {
  notificationOverride = notifier;
}

export function resolveMeetingNotificationConfiguration(
  environment: NotificationEnvironment = process.env,
): MeetingNotificationConfiguration | undefined {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const to = environment.MEETING_OWNER_EMAIL?.trim();
  const from = environment.RESEND_FROM_EMAIL?.trim();
  const configured = [apiKey, to, from].filter(Boolean).length;

  if (configured === 0) {
    return undefined;
  }
  if (configured !== 3) {
    throw new MeetingNotificationConfigurationError(
      "RESEND_API_KEY, MEETING_OWNER_EMAIL, and RESEND_FROM_EMAIL must be configured together.",
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(to!)) {
    throw new MeetingNotificationConfigurationError(
      "MEETING_OWNER_EMAIL must be a valid email address.",
    );
  }

  return { apiKey: apiKey!, to: to!, from: from! };
}

export async function sendMeetingNotification(
  input: MeetingNotificationInput,
  options: MeetingNotificationOptions,
) {
  if (!/^[A-Za-z0-9._:/-]{1,256}$/.test(options.idempotencyKey)) {
    throw new Error("A valid notification idempotency key is required.");
  }

  if (notificationOverride) {
    await notificationOverride(input, options);
    return true;
  }

  const configuration =
    options.configuration ?? resolveMeetingNotificationConfiguration();
  if (!configuration) {
    return false;
  }

  const formattedStart = new Intl.DateTimeFormat("en", {
    timeZone: input.timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(input.start);
  const resend = new Resend(configuration.apiKey);
  const result = await withTimeout(
    resend.emails.send(
      {
        from: configuration.from,
        to: configuration.to,
        replyTo: input.email,
        subject: `${input.name} scheduled a conversation`,
        text: [
          `Hi ${site.name},`,
          "",
          `${input.name} scheduled a one-hour conversation with you for ${formattedStart}.`,
          "",
          `Reply to this email to contact ${input.name}.`,
          "",
          "The meeting is already in your Google Calendar.",
          "",
          input.meetLink
            ? `Join the Google Meet: ${input.meetLink}`
            : "The Google Meet link will appear in the calendar event shortly.",
          ...(input.calendarLink
            ? ["", `Open the calendar event: ${input.calendarLink}`]
            : []),
        ].join("\n"),
      },
      { idempotencyKey: options.idempotencyKey },
    ),
    MEETING_NOTIFICATION_TIMEOUT_MS,
  );
  if (result.error) {
    throw new Error(result.error.message);
  }
  return true;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error("Meeting notification timed out.")),
      timeoutMs,
    );
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}
