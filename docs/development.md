# Development

## Prerequisites

- Node.js 22.23.2 from the Node.js 22 release line
- npm 10.9.8, declared by `packageManager`
- Docker with Compose

Use `.nvmrc` with a compatible version manager. `package.json` and `.npmrc`
reject unsupported Node releases during direct installation. Use npm with the
committed `package-lock.json`; pnpm is not the supported package manager.

`npm run setup` bootstraps Node.js 22.23.2 and npm 10.9.8 through `npx`, so it
also works when the shell has a different Node release. The first invocation
may download these tools into the npm cache. This does not replace the global
Node installation or change the parent shell's runtime.

## First setup

```bash
cp .env.example .env.local
# Set GITHUB_OWNER in .env.local.
npm run setup
npm run dev
```

`npm run setup` is intentionally deterministic. It:

1. selects the pinned Node and npm versions and verifies Node compatibility;
2. requires `GITHUB_OWNER` in `.env.local`;
3. installs exactly `package-lock.json` with `npm ci`;
4. validates the Drizzle schema and migration state;
5. verifies that Docker is running;
6. adds local Redis, Postgres, and anonymous-session values when missing;
7. replaces the obsolete example database port `5432` with `5433`;
8. validates the local service and protection values;
9. starts Redis and Postgres and waits for their health checks;
10. applies and verifies local database migrations;
11. verifies Redis and tests the guestbook in isolated Postgres databases.

For later commands, activate Node 22 with your version manager. If you do not
have one configured, use the same isolated runtime to start development:

```bash
npx --yes --package=node@22.23.2 --package=npm@10.9.8 -- npm run dev
```

The script preserves custom values, writes `.env.local` atomically, refuses to
follow a symlink, and applies mode `0600`. Exported shell variables do not replace
the required persistent local configuration.

Use `npm run services:down` to stop the containers without deleting Postgres
data. Use `npm run services:up` to start them again. Redis binds only to
`127.0.0.1`, disables persistence, and contains disposable rate-limit, lock,
dedupe, and cache state. Postgres binds to `127.0.0.1:5433` and uses a named
volume.

## Environment configuration

### Database foundation

`src/db/schema.ts` defines the guestbook table. `src/db/client.ts` provides Neon
HTTP in production or node-postgres locally. Database commands load `.env.local`
with Next.js precedence and otherwise use local Postgres on port `5433`.

For schema changes, run `npm run db:generate -- --name=<migration-name>` and review
the generated SQL and snapshot. Apply locally with `npm run db:migrate`, then run
`npm run db:verify`. `npm run db:check` validates migration history and schema
coverage. Production delivery runs these checks before the deploy hook using a
direct `DATABASE_URL_UNPOOLED` secret in the protected GitHub production environment.

See [Guestbook](guestbook.md) for the legacy replacement, safe rollout sequence,
name cookie, moderation commands, API behavior, and isolated integration tests.

### Notes content

See [Notes](notes.md) for the build-time manifest contract, local and remote
configuration, reader behavior, and the direct Vercel Deploy Hook used after
notes publication. Published notes are optional; a missing production repository
creates an empty snapshot, while failures from a configured repository fail the
build.

### Project content

`GITHUB_OWNER` is required and has no personal fallback. `GITHUB_TOKEN` is
optional for a higher public GitHub API rate limit.

`predev` and `prebuild` reconcile public repositories owned by that account.
Repositories opt in by committing `.portfolio/project.md` on their default
branch. Its front matter contains `portfolioIndex`, `slug`, `name`,
`repositoryUrl`, `description`, `metaDescription`, `summary`, and `highlights`;
the body contains the English case study. `portfolioIndex` is a positive integer,
unique across published projects, and lower values appear first. Optional
`.portfolio/project.pt.md` and `.portfolio/project.ja.md` files repeat only the
editorial front matter and provide translated bodies. English is required and
is used when the requested translation is absent.

Markdown bodies start with `##` headings so expanded content nests under the
home page's projects section. Raw HTML is ignored. Store project images in the
source repository and reference them with a relative Markdown path such as
`![Dashboard](images/dashboard.webp)`. Image alt text is required when the image
conveys information and can be empty only when the image is decorative.

The writer and reader enforce the same normalized fields, Markdown body, string
slug, and project-index contract. Invalid records, unsupported translation keys,
duplicate slugs or indexes, and upstream failures stop the sync; a successful
sync atomically replaces the complete snapshot.

The application renders only from `.cache/github-projects.json`. It never calls
GitHub during visitor traffic. A valid empty snapshot is supported. Run
`npm run projects:sync` and restart the server to refresh the snapshot explicitly.

The scheduled and manual `.github/workflows/reconcile-projects.yml` workflow
calls `VERCEL_DEPLOY_HOOK_URL`. The Vercel build performs the authoritative fresh
public-only sync with its production `GITHUB_OWNER` and optional `GITHUB_TOKEN`.

### Shared protection

Local development uses `REDIS_URL`. Production ignores it and accepts only
`KV_REST_API_URL` with `KV_REST_API_TOKEN`. The public `POST /api/fit`,
`POST /api/meetings`, and `POST /api/guestbook` routes have no in-memory
runtime fallback and return `503` before external work when BotID, the signed
session, or shared storage is unavailable.

`ANON_SESSION_SECRET` must contain at least 32 characters. `npm run setup`
generates a longer local value. Redis keys contain HMAC-derived identities rather
than raw cookies, IP addresses, role descriptions, or meeting data.

### Structured logs

Sensitive operations emit one Pino wide event after completion:
`fit_assessment`, `meeting_scheduling`, or `guestbook_publish`. Search
production Runtime Logs by `operation_id`, or by the Vercel `request_id` when
present. Events contain terminal stage, outcome, duration, and safe integration
metadata. They do not contain visitor names, role descriptions, email addresses,
meeting times or links, guestbook messages, raw IP addresses, cookies, idempotency values, or
anonymous safety identities. Production output remains structured JSON;
`pino-pretty` formats the same records locally.

Public request bodies, operation error payloads, and OpenAI guardrail decisions
are validated with Zod schemas. Extend the existing feature schema instead of
adding parallel `typeof` and cast-based validators.

TypeScript linting uses the project service and rejects references marked
`@deprecated`. Prefer the documented replacement instead of suppressing the rule
unless compatibility with an external contract makes the deprecated API
unavoidable and the exception is documented inline.

### Role-fit assessment

Set `OPENAI_API_KEY` to enable the homepage role comparison. The `/api/fit`
endpoint accepts at most 16,000 characters, disables OpenAI response storage,
sends a privacy-safe safety identifier, and runs a 20-second input guardrail
before the 60-second evaluator. Neither call retries automatically. The Redis
lock outlives their combined deadline.

### Meeting scheduling

See [Meeting Scheduling](modules/meeting-scheduling.md) for OAuth setup and the
scheduling request contract. Resend owner notifications are optional and require
`RESEND_API_KEY`, `MEETING_OWNER_EMAIL`, and `RESEND_FROM_EMAIL` together.

## Production validation

`npm run build` runs `npm run env:validate` before project reconciliation and
compilation. It validates the critical production variables, Redis URL, secret
strength, and optional Resend group. Runtime guards remain fail closed.

See [CI and production setup](deployment.md) for the required GitHub secrets,
Vercel/provider settings, notes publication, and first guestbook rollout sequence.

## Commands

### Core

| Command                 | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run setup`         | Install the lockfile, start services, and prepare local data       |
| `npm run dev`           | Reconcile project content and start Next.js                        |
| `npm run build`         | Validate config, reconcile projects, and create a production build |
| `npm run start`         | Serve a completed production build                                 |
| `npm run services:up`   | Start all services defined in Compose                              |
| `npm run services:down` | Stop local services without deleting database data                 |

### Database

| Command                                | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `npm run db:generate -- --name=<name>` | Generate a reviewed migration from schema changes   |
| `npm run db:migrate`                   | Apply pending migrations to the configured database |
| `npm run db:check`                     | Validate migration history and schema coverage      |
| `npm run db:verify`                    | Compare the configured database with the schema     |
| `npm run db:studio`                    | Open Drizzle Studio for the configured database     |

### Project content and integrations

| Command                      | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `npm run projects:sync`      | Refresh the GitHub project snapshot       |
| `npm run notes:sync`         | Refresh the published notes snapshot      |
| `npm run env:validate`       | Validate production environment groups    |
| `npm run calendar:authorize` | Obtain and store the Google refresh token |

### Quality

| Command                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `npm run check`         | Run formatting, lint, type checking, and tests          |
| `npm run format`        | Format supported files                                  |
| `npm run format:check`  | Check formatting without writing                        |
| `npm run lint`          | Run ESLint                                              |
| `npm run typecheck`     | Generate Next.js types and run TypeScript               |
| `npm test`              | Prepare the neutral fixture and run deterministic tests |
| `npm run test:postgres` | Verify the generic Drizzle connection to Postgres       |
| `npm run test:redis`    | Exercise the configured local Redis adapter             |

## Testing

Before publishing a change, run:

```bash
npm run format:check
npm run lint
npm test
npm run test:redis
npm run db:check
npm run test:postgres
npm run env:validate
npm run typecheck
PROJECTS_SYNC_SKIP=1 npm run build
docker compose config --quiet
```

`npm test` discovers deterministic `*.test.mjs` files under `tests/` without
reading or replacing the development snapshot in `.cache/github-projects.json`.
Tests that need project data read the committed neutral fixture directly, so the
suite does not depend on a previous sync. Integration modules and runners live
under `tests/integration/`; `scripts/` is reserved for operational commands.
`npm run check` aggregates the first three quality commands and type checking. The
Redis and Postgres integration checks require the local services started by
`npm run setup` or `npm run services:up`.

CI runs the same quality checks, provisions Redis and Postgres containers,
validates the Drizzle migration history, exercises both real adapters, validates
Compose, and builds the committed GitHub fixture without contacting GitHub.

Dependabot checks npm packages and GitHub Actions every Monday. It groups
production and development patch/minor updates separately; major updates remain
individual pull requests so their migration and compatibility requirements stay
visible. Every update must pass the existing CI before merge.

## CI/CD

The CI fixture uses `fixture-owner`, not a repository owner or personal account,
so forks run the same deterministic checks. Actions use `.nvmrc` rather than an
independent Node version literal.

After quality checks pass on `main`, one serialized production job installs the
committed lockfile and calls the Vercel Deploy Hook. The protected GitHub
`production` environment must provide `VERCEL_DEPLOY_HOOK_URL`. `vercel.json`
disables Git-based automatic deployments. Delivery stays within the repository's
production workflows; keep the repository connection because the approved Deploy
Hooks depend on it.

The scheduled reconciliation workflow uses the same serialized deploy sequence.
The Vercel build then performs the authoritative project sync using its production
`GITHUB_OWNER` and optional `GITHUB_TOKEN`.
