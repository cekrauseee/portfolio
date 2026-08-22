# portfolio

A terminal-inspired personal portfolio built with Next.js and Tailwind CSS. It
combines statically rendered project case studies with focused tools for role-fit
assessment and meeting scheduling.

## Features

- statically rendered, indexable project case studies;
- role-fit assessments grounded in the published portfolio content;
- one-hour meeting scheduling with Google Calendar and Google Meet;
- a moderated visitor guestbook displayed on an interactive globe;
- bot detection, shared rate limits, concurrency locks, and replay-safe public actions;
- deterministic local setup backed by Docker Redis and Postgres;
- responsive light and dark layouts with accessible keyboard interactions;
- canonical metadata, structured data, sitemap, and social previews;
- optional build-time project records reconciled from public GitHub repositories.

## Local development

Prerequisites are Node.js 22.23.2, npm 10.9.8, and Docker with Compose. The
repository pins the supported Node release in `.nvmrc`, enforces it through
`package.json`, and installs exactly the committed lockfile. Copy the example
environment file, set the GitHub account to scan, and prepare the application:

```bash
cp .env.example .env.local
# Set GITHUB_OWNER in .env.local.
npm run setup
npm run dev
```

`npm run setup` runs `npm ci`, generates missing local service and protection
values, starts Redis and Postgres, verifies Redis, applies the committed Drizzle
migrations, verifies the resulting schema, and idempotently seeds demo visitor
messages. Open
[http://localhost:3000](http://localhost:3000).

The static portfolio needs no hosted services. `/fit` and guestbook moderation
require `OPENAI_API_KEY`; `/schedule` requires Google Calendar OAuth credentials.
Resend is an optional, best-effort owner notification; configure
`RESEND_API_KEY`, `MEETING_OWNER_EMAIL`, and `RESEND_FROM_EMAIL` together or leave
all three unset.

See [Development](docs/development.md) for authorization, environment variables,
commands, and operating details.

## Production

A production build fails before compiling when critical configuration, including
the Postgres connection, is absent or malformed. Configure:

- `GITHUB_OWNER` and, optionally, `GITHUB_TOKEN`;
- `DATABASE_URL` with the Neon pooled connection string in Vercel;
- `KV_REST_API_URL` and the write-capable `KV_REST_API_TOKEN` from the Vercel Marketplace;
- an `ANON_SESSION_SECRET` of at least 32 characters;
- `OPENAI_API_KEY`;
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`;
- optionally, the complete Resend group described above.

Enable BotID before opening public traffic. Configure Vercel WAF rules and an
OpenAI project hard-spend limit with alerts outside this repository.

Project case studies come from the validated `.cache/github-projects.json`
snapshot. `npm run dev` and `npm run build` refresh it by scanning public
repositories owned by `GITHUB_OWNER` and reading `.portfolio/project.json` from
each default branch. Visitor requests never call GitHub.

## Continuous delivery

GitHub Actions uses the pinned Node version and a neutral fixture owner. It runs
formatting, lint, deterministic tests, a real Redis adapter check, production
environment validation, TypeScript, Docker Compose validation, and a fixture-backed
production build on every push and pull request.

A passing push to `main` applies all pending migrations to the production
database, verifies the live schema, and only then triggers the Vercel Deploy Hook.
Configure the direct Neon connection as `DATABASE_URL_UNPOOLED` and the hook as
`VERCEL_DEPLOY_HOOK_URL` in the protected GitHub `production` environment.
Scheduled project reconciliation uses the same migration-before-deploy gate.
`vercel.json` disables automatic Git deployments. These workflows are the approved
production delivery path; do not deploy through the Vercel dashboard, CLI, API, or
direct Deploy Hook, because those methods bypass the migration and schema-verification
gate.

## Structure

- `src/app` contains routes, metadata files, and global styles.
- `src/components` contains reusable UI.
- `src/features` groups role-fit, meeting-scheduling, and guestbook code by capability.
- `src/features/guestbook/server` owns persistence, cache, geolocation, moderation, and HTTP orchestration; `src/features/guestbook/globe` owns the client globe.
- `tests/` contains deterministic tests and integration helpers; `scripts/` contains operational commands.
- `src/config/site.ts` is the canonical public identity and site configuration.
- `src/content/portfolio.ts` contains profile details, social links, and project loading.
- `src/content/github-projects.ts` validates the build-time GitHub snapshot.
- `scripts/sync-github-projects.mjs` reconciles public convention files into the snapshot.
- `public/` and project configuration remain at the repository root.

## License

This project is available under the [MIT License](LICENSE).
