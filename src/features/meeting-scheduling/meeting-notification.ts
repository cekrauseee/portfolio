import { Resend } from "resend";

export async function sendMeetingNotification(input: {
  name: string;
  email: string;
  start: Date;
  timeZone: string;
  meetLink?: string;
  calendarLink?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.MEETING_OWNER_EMAIL?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from) {
    throw new Error("Meeting email is not configured.");
  }

  const ownerName = process.env.MEETING_OWNER_NAME?.trim() || "Henrique Krause";
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
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    replyTo: input.email,
    subject: `${input.name} scheduled a conversation`,
    text: [
      `Hi ${ownerName},`,
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
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
}
