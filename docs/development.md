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

### GitHub project content

Project content always comes from the validated
`.cache/github-projects.json` snapshot. The site never requests GitHub for
visitor traffic and refuses a missing or invalid snapshot. A valid empty
snapshot is allowed so removing every convention file removes all project routes
on the next build.

Every public repository owned by `GITHUB_OWNER` (default `cekrauseee`) is
eligible, including forks and archived repositories; private repositories are
always excluded. A repository participates only when its default branch contains
`.portfolio/project.json`. The file must
contain exactly the normalized Project fields: `slug`, `name`, `description`,
`repositoryUrl`, `metaDescription`, `summary`, `highlights`, and `sections`.
Slugs use lowercase letters, numbers, and single hyphens, and must be unique.
Malformed files, unsafe or duplicate slugs, and GitHub errors fail the sync.
Missing files return 404 and are skipped.

Run the local development server with:

```bash
npm run dev
```

`predev` runs `npm run projects:sync` before starting Next.js, so a fresh clone
is plug-and-play after `npm install`. The snapshot remains inspectable at
`.cache/github-projects.json`. Run `npm run projects:sync` and restart the
server when you want to refresh project content explicitly.

`GITHUB_TOKEN` is optional for public repositories and can be set to increase
the GitHub API rate limit. The sync fully replaces the snapshot, so deleted
repositories or convention files disappear on the next successful run. It
writes through a temporary file and atomic rename; a failed reconciliation
leaves the previous snapshot intact.

The scheduled and manual `.github/workflows/reconcile-projects.yml` workflow
only calls the existing `VERCEL_DEPLOY_HOOK_URL`. Configure the Vercel build
command as the standard `npm run build`, and set `GITHUB_OWNER` plus (optionally)
`GITHUB_TOKEN` in Vercel. The `prebuild` hook then performs the one authoritative
fresh public-only sync for that production build. No secrets are changed by the
workflow.

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
npm run calendar:authorize
```

The command opens Google consent in the browser and saves
`GOOGLE_REFRESH_TOKEN` to the ignored `.env.local` file without printing it.
Use an OAuth app with publishing status `In production`; external apps left in
`Testing` issue Calendar refresh tokens that expire after seven days.

The scheduling endpoint is `POST /api/meetings` with JSON
`{ "name", "email", "start", "timeZone" }`; `start` must be a future local
whole-hour value such as `2026-08-20T14:00`.

## Commands

### Core

| Command            | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Start the development server                           |
| `npm run predev`   | Refresh the GitHub project snapshot before development |
| `npm run prebuild` | Refresh the GitHub project snapshot before a build     |
| `npm run build`    | Create the production build                            |
| `npm run start`    | Serve a completed production build                     |

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
| `npm test`             | Run mocked GitHub sync tests                     |

### Integrations

| Command                      | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `npm run calendar:authorize` | Authorize the calendar owner locally |

## Testing

The repository includes dependency-light mocked GitHub reconciliation tests.
Before publishing a change, run:

```bash
npm run format:check
npm run lint
npm test
npm run typecheck
npm run build
```

The first four checks are also available as the local aggregate
`npm run check`.

CI runs these checks and builds the committed GitHub fixture without contacting
GitHub by setting `PROJECTS_SYNC_SKIP=1` only after copying an existing fixture
snapshot. The scheduled/manual
reconciliation workflow is separate and only triggers the Vercel deploy hook.

## CI/CD

GitHub Actions runs the same checks on every push and pull request. After all
checks pass for a push to `main`, the workflow calls the Vercel Deploy Hook in
the `VERCEL_DEPLOY_HOOK_URL` repository secret. Disable Vercel's Git-based
automatic deployments so this hook is the only production deployment trigger.
`vercel.json` enforces this with `git.deploymentEnabled: false`. Keep the Git
repository connected and do not use `github.enabled: false`,
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
