# Development

## Prerequisites

- Node.js 22 or newer
- npm
- Docker with Compose

## Setup

Create the local environment file, configure the GitHub account whose public
projects should be scanned, then prepare dependencies and Redis:

```bash
cp .env.example .env.local
# Set GITHUB_OWNER in .env.local.
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run setup` preserves existing `.env.local` values, adds the local
`REDIS_URL` and a generated `ANON_SESSION_SECRET` only when missing, starts Redis
from `compose.yaml`, waits for its health check, and verifies the application
adapter. Use `npm run services:down` to stop and remove the local service and
`npm run services:up` to start it again.

To enable role-fit assessment, set `OPENAI_API_KEY` in `.env.local`. To enable
meeting scheduling, provide the Google Calendar, owner notification, and Resend
variables described below.

### Protection configuration

The public `POST /api/fit` and `POST /api/meetings` routes require a working
Redis adapter. Development and test-like local runs use `REDIS_URL`; production
ignores that variable and requires the Vercel Marketplace credentials
`KV_REST_API_URL` and the write-capable `KV_REST_API_TOKEN`. There is no implicit
in-memory runtime fallback: missing or failed protection storage returns `503`
before an external operation is called.

Set a long random `ANON_SESSION_SECRET` in production. `npm run setup` generates
a local value. BotID protects both POST routes; its hosted check is bypassed only
by its documented development behavior. Rate-limit, lock, and dedupe keys contain
HMAC-derived identifiers rather than raw session, IP, role-description, or
meeting values.

Deploy in this order: configure Redis and secrets, enable BotID, deploy and test
allowed and blocked requests, then configure Vercel WAF rules and an OpenAI
project hard-spend limit with alerts before public traffic. Those external
controls are deployment prerequisites and are not configured by this repository.

### GitHub project content

Project content always comes from the validated
`.cache/github-projects.json` snapshot. The site never requests GitHub during a
visitor request and refuses a missing or invalid snapshot. A valid empty snapshot
is allowed, so removing every convention file removes all project routes on the
next build.

`GITHUB_OWNER` is required and has no repository-specific fallback. Every public
repository owned by that configured account is eligible, including forks and
archived repositories; private repositories are always excluded. A repository
participates only when its default branch contains `.portfolio/project.json`.
The file must contain exactly the normalized Project fields: `slug`, `name`,
`description`, `repositoryUrl`, `metaDescription`, `summary`, `highlights`, and
`sections`. Slugs use lowercase letters, numbers, and single hyphens and must be
unique. Malformed files, unsafe or duplicate slugs, and GitHub errors fail the
sync. Missing files return 404 and are skipped.

`predev` runs `npm run projects:sync` before starting Next.js, and `prebuild`
runs the production reconciliation before a build. The snapshot remains
inspectable at `.cache/github-projects.json`. Run `npm run projects:sync` and
restart the server when you want to refresh it explicitly.

`GITHUB_TOKEN` is optional for public repositories and can be set in
`.env.local` to increase the GitHub API rate limit. The standalone command loads
the same environment-file precedence as Next.js; an exported value remains
authoritative. A successful sync atomically replaces the complete snapshot, so
deleted repositories or convention files disappear. A failed reconciliation
leaves the previous snapshot intact.

The scheduled and manual `.github/workflows/reconcile-projects.yml` workflow
only calls `VERCEL_DEPLOY_HOOK_URL`. Configure Vercel's build command as
`npm run build` and set `GITHUB_OWNER` plus, optionally, `GITHUB_TOKEN`. The
`prebuild` hook performs the authoritative fresh public-only sync.

### Google Calendar authorization

Copy `.env.example` to `.env.local` and provide the Google OAuth client
credentials, owner email, Resend API key, and verified Resend sender.
`GOOGLE_CALENDAR_ID` is optional and defaults to the authenticated account's
primary calendar.

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
npm run calendar:authorize
```

The command opens Google consent in the browser and saves
`GOOGLE_REFRESH_TOKEN` to the ignored `.env.local` file without printing it. Use
an OAuth app with publishing status `In production`; external apps left in
`Testing` issue Calendar refresh tokens that expire after seven days.

The scheduling endpoint is `POST /api/meetings` with JSON
`{ "name", "email", "start", "timeZone" }`; `start` must be a future local
whole-hour value such as `2026-08-20T14:00`. It also requires an
`Idempotency-Key` header. The browser keeps one key for the canonical payload
through retryable failures and replaces it after success, a real conflict, or a
payload change. Calendar events carry private application, schema, request, and
idempotency digests; only an exact metadata match can return an existing event's
links. Cancelled deterministic events are restored as fresh bookings rather than
replayed.

## Commands

### Core

| Command                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `npm run setup`         | Install dependencies and prepare local Redis           |
| `npm run dev`           | Start the development server                           |
| `npm run predev`        | Refresh the GitHub project snapshot before development |
| `npm run prebuild`      | Refresh the GitHub project snapshot before a build     |
| `npm run build`         | Create the production build                            |
| `npm run start`         | Serve a completed production build                     |
| `npm run services:up`   | Start the local Redis service                          |
| `npm run services:down` | Stop and remove the local Redis service                |

### Project content

| Command                 | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `npm run projects:sync` | Reconcile public GitHub project records into the local snapshot |

### Quality

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `npm run check`        | Run formatting, lint, type, and test checks      |
| `npm run format`       | Format supported files                           |
| `npm run format:check` | Check formatting without writing                 |
| `npm run lint`         | Run ESLint with the Next.js and TypeScript rules |
| `npm run typecheck`    | Run TypeScript without emitting files            |
| `npm test`             | Run unit and mocked integration tests            |
| `npm run test:redis`   | Verify the running local Redis adapter           |

### Integrations

| Command                      | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `npm run calendar:authorize` | Authorize the calendar owner locally |

## Testing

Before publishing a change, run:

```bash
npm run format:check
npm run lint
npm test
npm run typecheck
npm run test:redis
npm run build
docker compose config --quiet
```

The first four checks are also available as the local aggregate
`npm run check`. `npm run test:redis` requires the local service started by
`npm run setup` or `npm run services:up`.

CI runs the same quality checks, provisions a Redis service container, exercises
the real local adapter, validates Compose, and builds the committed GitHub
fixture without contacting GitHub by setting `PROJECTS_SYNC_SKIP=1` after
copying the fixture snapshot. The reconciliation workflow is separate and only
triggers the Vercel deploy hook.

## CI/CD

GitHub Actions runs the checks on every push and pull request. After all checks
pass for a push to `main`, the workflow calls the Vercel Deploy Hook in the
`VERCEL_DEPLOY_HOOK_URL` repository secret. Disable Vercel's Git-based automatic
deployments so this hook is the only production deployment trigger.
`vercel.json` enforces this with `git.deploymentEnabled: false`. Keep the Git
repository connected and do not use `github.enabled: false`, because Vercel
Deploy Hooks need that integration enabled.

For layout changes, also inspect the page at desktop width and at mobile widths
down to 320 CSS pixels. Confirm that links remain keyboard accessible, project
cards retain their full hit area, and the page has no horizontal overflow.

## Conventions

- Keep components as React Server Components unless browser state or event
  handling requires a client boundary.
- Use Tailwind utilities for component styling. Keep `src/app/globals.css`
  limited to Tailwind setup and truly global tokens or defaults.
- Update portfolio content in `src/content/portfolio.ts`.
- Use Next.js `Link` for navigation and preserve visible focus states.
- Write English Conventional Commit messages.
