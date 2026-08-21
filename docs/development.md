# Development

## Prerequisites

- Node.js 22.23.2 from the Node.js 22 release line
- npm 10.9.8, declared by `packageManager`
- Docker with Compose

Use `.nvmrc` with a compatible version manager. `package.json` and `.npmrc`
reject unsupported Node releases during installation.

## First setup

```bash
cp .env.example .env.local
# Set GITHUB_OWNER in .env.local.
npm run setup
npm run dev
```

`npm run setup` is intentionally deterministic. It:

1. rejects an unsupported Node version;
2. requires `GITHUB_OWNER` in `.env.local`;
3. installs exactly `package-lock.json` with `npm ci`;
4. verifies that Docker is running;
5. adds local Redis, Postgres, and anonymous-session values when missing;
6. replaces the obsolete example database port `5432` with `5433`;
7. validates the local service and protection values;
8. starts Redis and Postgres and waits for their health checks;
9. verifies Redis, pushes the Drizzle schema, and idempotently seeds demo messages.

The script preserves custom values, writes `.env.local` atomically, refuses to
follow a symlink, and applies mode `0600`. Exported shell variables do not replace
the required persistent local configuration.

Use `npm run services:down` to stop the containers without deleting Postgres
data. Use `npm run services:up` to start them again. Redis binds only to
`127.0.0.1`, disables persistence, and contains disposable rate-limit, lock,
dedupe, and cache state. Postgres binds to `127.0.0.1:5433` and uses a named
volume.

## Environment configuration

### Visitor database

The guestbook stores approved messages in Postgres. Standalone database commands
load `.env.local` with Next.js environment precedence and otherwise use the local
Compose connection on port `5433`.

Run `npm run db:push` after changing
`src/features/guestbook/server/db/schema.ts`. Run `npm run db:seed` to add missing
demo records. The seed is idempotent and does not delete visitor data.
`npm run db:studio` opens Drizzle Studio for the configured database.

In production, set `DATABASE_URL` to the Neon pooled connection string and run
`npm run db:push` before deploying code that depends on a schema change. Do not
seed production unless the demo messages are intentionally wanted there.

### Project content

`GITHUB_OWNER` is required and has no personal fallback. `GITHUB_TOKEN` is
optional for a higher public GitHub API rate limit.

`predev` and `prebuild` reconcile public repositories owned by that account.
Repositories opt in by committing `.portfolio/project.json` on their default
branch. Identity fields (`slug`, `name`, and `repositoryUrl`) stay at the top
level. Put `description`, `metaDescription`, `summary`, `highlights`, and
`sections` under `translations.en`, with optional matching `pt` and `ja` entries.
English is required and is used when the requested translation is absent. The
sync still accepts the previous English-only shape so repositories can migrate
independently.

The writer and reader enforce the same normalized fields and string slug
contract. Invalid records, unsupported translation keys, duplicate slugs, and
upstream failures stop the sync; a successful sync atomically replaces the
complete snapshot.

The application renders only from `.cache/github-projects.json`. It never calls
GitHub during visitor traffic. A valid empty snapshot is supported. Run
`npm run projects:sync` and restart the server to refresh the snapshot explicitly.

The scheduled and manual `.github/workflows/reconcile-projects.yml` workflow
calls `VERCEL_DEPLOY_HOOK_URL`. The Vercel build performs the authoritative fresh
public-only sync with its production `GITHUB_OWNER` and optional `GITHUB_TOKEN`.

### Shared protection

Local development uses `REDIS_URL`. Production ignores it and accepts only
`KV_REST_API_URL` with `KV_REST_API_TOKEN`. The public `POST /api/fit`,
`POST /api/meetings`, `POST /api/guestbook`, and legacy `POST /api/visitor-globe` routes have no in-memory
runtime fallback and return `503` before external work when BotID, the signed
session, or shared storage is unavailable.

The guestbook also uses Redis for a five-minute global message snapshot. Cache
commands have a short abortable deadline and do not retry. Read and fill failures
fall back to Postgres. Failed invalidation can leave the old snapshot available
until its TTL expires.

`ANON_SESSION_SECRET` must contain at least 32 characters. `npm run setup`
generates a longer local value. Redis keys contain HMAC-derived identities rather
than raw cookies, IP addresses, role descriptions, or meeting data.

### Role-fit assessment and moderation

Set `OPENAI_API_KEY` to enable `/fit` and visitor-message moderation. The role-fit
endpoint accepts at most 16,000 characters, disables OpenAI response storage,
sends a privacy-safe safety identifier, and uses a bounded upstream request with
no SDK retries. Its Redis lock outlives that request deadline.

### Meeting scheduling

See [Meeting Scheduling](modules/meeting-scheduling.md) for OAuth setup and the
scheduling request contract. Resend owner notifications are optional and require
`RESEND_API_KEY`, `MEETING_OWNER_EMAIL`, and `RESEND_FROM_EMAIL` together.

## Production validation

`npm run build` runs `npm run env:validate` before project reconciliation and
compilation. It validates the critical production variables, Redis URL, secret
strength, and optional Resend group. Runtime guards remain fail closed.

Production deployment order:

1. apply the Postgres schema;
2. connect Upstash through the Vercel Marketplace;
3. configure the required environment variables;
4. enable BotID;
5. deploy and verify allowed, blocked, rate-limited, and unavailable responses;
6. configure Vercel WAF rules and OpenAI spending controls.

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

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `npm run db:push`   | Reconcile the configured database with the schema |
| `npm run db:seed`   | Add missing guestbook demo messages               |
| `npm run db:studio` | Open Drizzle Studio for the configured database   |

### Project content and integrations

| Command                      | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `npm run projects:sync`      | Refresh the GitHub project snapshot       |
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
| `npm run test:postgres` | Verify visitor-message persistence in Postgres          |
| `npm run test:redis`    | Exercise the configured local Redis adapter             |

## Testing

Before publishing a change, run:

```bash
npm run format:check
npm run lint
npm test
npm run test:redis
npm run db:push
npm run test:postgres
npm run db:seed
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
`npm run check` aggregates the
first three quality commands and type checking. The Redis and Postgres integration
checks require the local services started by `npm run setup` or
`npm run services:up`; run `db:push` before the Postgres test when the schema is
not prepared.

CI runs the same quality checks, provisions Redis and Postgres containers,
exercises both real adapters, pushes and seeds the database, validates Compose,
and builds the committed GitHub fixture without contacting GitHub. The
reconciliation workflow is separate and only triggers the Vercel deploy hook.

## CI/CD

The CI fixture uses `fixture-owner`, not a repository owner or personal account,
so forks run the same deterministic checks. Actions use `.nvmrc` rather than an
independent Node version literal.

After quality checks pass on `main`, GitHub Actions calls the Vercel Deploy Hook.
`vercel.json` disables Git-based automatic deployments; keep the repository
connection because Deploy Hooks depend on it.

The scheduled reconciliation workflow triggers the same deploy hook daily. The
Vercel build then performs the authoritative project sync using its production
`GITHUB_OWNER` and optional `GITHUB_TOKEN`.
