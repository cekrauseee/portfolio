# Meeting Scheduling

## Local authorization

Provide the Google OAuth client credentials in `.env.local`.
`GOOGLE_CALENDAR_ID` is optional and defaults to the authenticated account's
primary calendar. Owner email notifications are also optional; enable them by
setting `MEETING_OWNER_EMAIL`, `RESEND_API_KEY`, and a verified
`RESEND_FROM_EMAIL` together.

In Google Cloud, enable the Google Calendar API, configure the OAuth consent
screen, and create an OAuth 2.0 client with these scopes:

```text
https://www.googleapis.com/auth/calendar.events.owned
https://www.googleapis.com/auth/calendar.events.freebusy
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. A desktop OAuth client
supports the local loopback flow. For a web OAuth client, add this authorized
redirect URI:

```text
http://localhost:53682/oauth2callback
```

Authorize the calendar owner:

```bash
npm run calendar:authorize
```

The command opens Google consent and saves `GOOGLE_REFRESH_TOKEN` to the ignored
`.env.local` file without printing it. Use an OAuth app with publishing status
`In production`; external apps left in `Testing` issue refresh tokens that
expire after seven days.

## Request contract

`POST /api/meetings` accepts JSON `{ "name", "email", "start", "timeZone" }`.
Names contain 2–120 characters and email addresses contain at most 254
characters; client and server import the same validation contract.
`start` must be a future local whole-hour value such as
`2026-08-20T14:00`. The request also requires an `Idempotency-Key` header.

The browser keeps one key for the canonical payload through retryable failures
and replaces it after success, a real conflict, or a payload change. Calendar
events carry private application, schema, request, and idempotency digests. Only
an exact metadata match can return existing event links. Cancelled deterministic
events are restored as fresh bookings rather than replayed.

Errors return stable codes plus an opaque operation ID. `Retry-After` remains an
HTTP signal for clients, while the portfolio UI uses non-numeric localized retry
guidance.
