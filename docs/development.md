# Development

## Prerequisites

- Node.js 20.19 or newer
- npm

## Setup

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable role-fit assessment, set `OPENAI_API_KEY` in `.env.local`. The
portfolio and project pages do not require this variable.

To enable meeting scheduling, copy `.env.example` to `.env.local` and provide
the Google OAuth client credentials, owner email, Resend API key, and verified
Resend sender. `GOOGLE_CALENDAR_ID` is optional and defaults to the authenticated
account's primary calendar.

### Google Calendar authorization

In Google Cloud, enable the Google Calendar API, configure the OAuth consent
screen, and create an OAuth 2.0 client. Request these scopes:

```text
https://www.googleapis.com/auth/calendar.events.owned
https://www.googleapis.com/auth/calendar.events.freebusy
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`. A desktop
OAuth client supports the local loopback flow directly. For a web OAuth client,
add this authorized redirect URI:

```text
http://127.0.0.1:53682/oauth2callback
```

Then authorize the calendar owner:

```bash
npm run google-calendar:authorize
```

The command opens Google consent in the browser and saves
`GOOGLE_REFRESH_TOKEN` to the ignored `.env.local` file without printing it.
Use an OAuth app with publishing status `In production`; external apps left in
`Testing` issue Calendar refresh tokens that expire after seven days.

The scheduling endpoint is `POST /api/meetings` with JSON
`{ "name", "email", "start", "timeZone" }`; `start` must be a future local
whole-hour value such as `2026-08-20T14:00`.

## Commands

| Command                             | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `npm run dev`                       | Start the development server                     |
| `npm run build`                     | Type-check and create the production build       |
| `npm run start`                     | Serve a completed production build               |
| `npm run google-calendar:authorize` | Authorize the calendar owner locally             |
| `npm run format`                    | Format supported files                           |
| `npm run format:check`              | Check formatting without writing                 |
| `npm run lint`                      | Run ESLint with the Next.js and TypeScript rules |
| `npm run typecheck`                 | Run TypeScript without emitting files            |

## Testing

There is no automated test suite. Before publishing a change, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## CI/CD

GitHub Actions runs the same checks on every push and pull request. After all
checks pass for a push to `main`, the workflow calls the Vercel Deploy Hook in
the `VERCEL_DEPLOY_HOOK_URL` repository secret. Disable Vercel's Git-based
automatic deployments so this hook is the only production deployment trigger.
`vercel.json` enforces this with `git.deploymentEnabled: false`. Keep the Git
repository connected and do not use the legacy `github.enabled: false` setting,
because Vercel Deploy Hooks need that integration enabled.

For layout changes, also inspect the page at desktop width and at mobile widths
down to 320 CSS pixels. Confirm that links remain keyboard accessible, project
cards retain their full hit area, and the page has no horizontal overflow.

## Conventions

- Keep components as React Server Components unless browser state or event
  handling requires a client boundary.
- Use Tailwind utilities for component styling. Keep `src/app/globals.css` limited
  to Tailwind setup and truly global tokens or defaults.
- Update portfolio content in `src/content/portfolio.ts`.
- Use Next.js `Link` for navigation and preserve visible focus states.
- Write English Conventional Commit messages.
