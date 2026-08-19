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
5. adds the local `REDIS_URL` and a strong `ANON_SESSION_SECRET` only when missing;
6. validates those protection values;
7. starts Redis from `compose.yaml` and waits for health;
8. runs the real local Redis integration test.

The script preserves existing values, writes `.env.local` atomically, refuses to
follow a symlink, and applies mode `0600`. Exported shell variables do not replace
the required persistent local configuration.

Use `npm run services:down` to stop and remove Redis and `npm run services:up` to
start it again. Local Redis binds only to `127.0.0.1`, disables persistence, and
contains disposable rate-limit, lock, and dedupe state.

## Environment configuration

### Project content

`GITHUB_OWNER` is required and has no personal fallback. `GITHUB_TOKEN` is
optional for a higher public GitHub API rate limit.

`predev` and `prebuild` reconcile public repositories owned by that account.
Repositories opt in by committing `.portfolio/project.json` on their default
branch. The writer and reader enforce the same normalized fields and string slug
contract. Invalid records, duplicate slugs, and upstream failures stop the sync;
a successful sync atomically replaces the complete snapshot.

The application renders only from `.cache/github-projects.json`. It never calls
GitHub during visitor traffic. A valid empty snapshot is supported.

### Shared protection

Local development uses `REDIS_URL`. Production ignores it and accepts only
`KV_REST_API_URL` with `KV_REST_API_TOKEN`. The two public POST routes have no
in-memory runtime fallback and return `503` before calling an external service
when BotID, the signed-session secret, or shared storage is unavailable.

`ANON_SESSION_SECRET` must contain at least 32 characters. `npm run setup`
generates a longer local value. Redis keys contain HMAC-derived identities rather
than raw cookies, IP addresses, role descriptions, or meeting data.

### Role-fit assessment

Set `OPENAI_API_KEY` to enable `/fit`. The endpoint accepts at most 16,000
characters, disables OpenAI response storage, sends a privacy-safe safety
identifier, and uses a bounded upstream request with no SDK retries. Its Redis
lock outlives that request deadline.

### Google Calendar

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then run:

```bash
npm run calendar:authorize
```

For a web OAuth client, register this exact redirect URI:

```text
http://localhost:53682/oauth2callback
```

The authorization command uses PKCE and state validation, requests the owned-event
and free/busy scopes, and writes `GOOGLE_REFRESH_TOKEN` to `.env.local` without
printing it. `GOOGLE_CALENDAR_ID` is optional and defaults to `primary`.

The scheduling endpoint requires a future local whole-hour start, an IANA time
zone, and an `Idempotency-Key`. Google requests have explicit deadlines. The
operation lock is derived from a conservative upper bound for all Calendar calls,
conference polling, and optional notification work.

Calendar events use deterministic event and conference IDs plus private
application, schema, idempotency, and request digests. An existing event is
returned only for the exact original operation. A same-slot request with another
key or payload gets a generic conflict. A cancelled deterministic event is
restored as a fresh booking.

### Optional Resend notification

The Calendar invitation is the authoritative booking result. A separate owner
email through Resend is optional and best effort. To enable it, configure all of:

```text
RESEND_API_KEY
MEETING_OWNER_EMAIL
RESEND_FROM_EMAIL
```

Leaving all three unset disables the extra email without affecting scheduling.
A partial group is a configuration error and stops a production build. Delivery
has a deadline and uses a deterministic Resend idempotency key, so an ambiguous
retry cannot send a duplicate. The owner display name comes from
`src/config/site.ts`; there is no separate owner-name environment variable.

## Production validation

`npm run build` always runs `npm run env:validate` before project reconciliation
and compilation. It requires the critical production variables, validates the
Redis URL and secret strength, and validates the optional Resend group. This
turns missing deployment configuration into a failed deployment rather than a
first-request outage.

Production deployment order:

1. connect Upstash through the Vercel Marketplace;
2. configure the required environment variables;
3. enable BotID;
4. deploy and verify allowed, blocked, rate-limited, and unavailable responses;
5. configure Vercel WAF rules and OpenAI spending controls.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Install the lockfile and prepare local Redis |
| `npm run dev` | Reconcile project content and start Next.js |
| `npm run build` | Validate production config, reconcile projects, and build |
| `npm run start` | Serve a completed production build |
| `npm run projects:sync` | Refresh the GitHub project snapshot |
| `npm run env:validate` | Validate production environment groups |
| `npm run services:up` | Start local Redis |
| `npm run services:down` | Stop and remove local Redis |
| `npm run calendar:authorize` | Obtain and store the Google refresh token |
| `npm run format` | Format supported files |
| `npm run format:check` | Check formatting |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate Next.js types and run TypeScript |
| `npm test` | Prepare the neutral fixture and run deterministic tests |
| `npm run test:redis` | Exercise the configured local Redis adapter |
| `npm run check` | Run formatting, lint, type checking, and tests |

`npm test` creates its own `.cache/github-projects.json` from the committed
neutral fixture, so it works in a fresh clone and does not depend on a previous
dev server or sync. `npm run test:redis` loads `REDIS_URL` through the same local
environment precedence as Next.js.

Before publishing a change, run:

```bash
npm run format:check
npm run lint
npm test
npm run test:redis
npm run env:validate
npm run typecheck
npm run build
docker compose config --quiet
```

CI performs this sequence with a Redis service container and fixture-only build.

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
