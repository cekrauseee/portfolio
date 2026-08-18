import {
  MeetingConflictError,
  MeetingInputError,
  scheduleMeeting,
  validateMeetingRequest,
} from "@/lib/meeting";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send meeting details as JSON." },
      { status: 400 },
    );
  }
  try {
    const meeting = await scheduleMeeting(validateMeetingRequest(body));
    return Response.json(
      {
        ok: true,
        meetLink: meeting.meetLink,
        calendarLink: meeting.calendarLink,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MeetingInputError)
      return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof MeetingConflictError)
      return Response.json({ error: error.message }, { status: 409 });
    console.error("Meeting scheduling failed", error);
    return Response.json(
      { error: "Unable to schedule a meeting right now." },
      { status: 502 },
    );
  }
}
