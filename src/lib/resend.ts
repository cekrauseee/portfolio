import { Resend } from "resend";

export async function sendOwnerMeetingNotification(input: {
  name: string;
  email: string;
  startLabel: string;
  timeZone: string;
  meetLink?: string;
  calendarLink?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.MEETING_OWNER_EMAIL?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from)
    throw new Error("Meeting email is not configured.");

  const ownerName = process.env.MEETING_OWNER_NAME?.trim() || "Henrique Krause";
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject: `New meeting with ${input.name}`,
    text: [
      `A new one-hour meeting was scheduled with ${input.name}.`,
      `Guest email: ${input.email}`,
      `Start: ${input.startLabel} (${input.timeZone})`,
      `Google Meet: ${input.meetLink || "The Meet link will appear in the calendar invitation."}`,
      ...(input.calendarLink ? [`Calendar event: ${input.calendarLink}`] : []),
      `Owner: ${ownerName}`,
    ].join("\n"),
  });
  if (result.error) throw new Error(result.error.message);
}
