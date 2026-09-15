# portfolio

A centered editorial personal portfolio built with Next.js and Tailwind CSS. It
combines inline project case studies with focused tools for role-fit assessment
and meeting scheduling, plus a public guestbook.

## Features

- server-rendered project case studies that expand inline on the home page;
- role-fit assessments grounded in the published portfolio content;
- one-hour meeting scheduling with Google Calendar and Google Meet;
- an inline guestbook with paginated messages, a remembered name, and a simple OpenAI guardrail;
- bot detection, shared rate limits, concurrency locks, and replay-safe public actions;
- deterministic local setup backed by Docker Redis and Postgres;
- responsive light and dark layouts with accessible keyboard interactions;
- canonical metadata, structured data, sitemap, and social previews;
- optional build-time project records reconciled from public GitHub repositories;
- optional build-time multilingual notes with on-demand narration and timed reading.

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

`npm run setup` selects Node.js 22.23.2 and npm 10.9.8 through `npx`, then
runs `npm ci`, generates missing local service and protection
values, starts Redis and Postgres, applies migrations, and verifies both local services.
The bootstrap does not change the Node version in your shell. Before running
`npm run dev`, activate Node 22 or use the isolated command documented in
[Development](docs/development.md#first-setup). Use npm, not pnpm, with this
repository's lockfile.
Open
[http://localhost:3000](http://localhost:3000).

Populate the local guestbook with thirteen idempotent demo messages (three
pages) using:

```bash
npm run guestbook:seed
```

The static portfolio needs no hosted services. Role comparison requires
`OPENAI_API_KEY`; the guestbook also uses it and Postgres. Scheduling requires Google Calendar OAuth credentials.
Resend is an optional, best-effort owner notification; configure
`RESEND_API_KEY`, `MEETING_OWNER_EMAIL`, and `RESEND_FROM_EMAIL` together or leave
all three unset.

See [Development](docs/development.md) for authorization, environment variables,
commands, and operating details.

## Production

A production build fails before compiling when critical configuration is absent
or malformed. Configure:

- `GITHUB_OWNER` and, optionally, `GITHUB_TOKEN`;
- `KV_REST_API_URL` and the write-capable `KV_REST_API_TOKEN` from the Vercel Marketplace;
- an `ANON_SESSION_SECRET` of at least 32 characters;
- `OPENAI_API_KEY`;
- `DATABASE_URL` for the guestbook;
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`;
- optionally, the complete Resend group described above.

Enable BotID before opening public traffic. Configure Vercel WAF rules and an
OpenAI project hard-spend limit with alerts outside this repository.

Project case studies come from the validated `.cache/github-projects.json`
snapshot. `npm run dev` and `npm run build` refresh it by scanning public
repositories owned by `GITHUB_OWNER` and reading `.portfolio/project.md` from
each default branch. Visitor requests never call GitHub.

Published notes come from the configured `NOTES_REPOSITORY` at build time. In
development, an unset repository reads `../notes`; in production, an unset
repository creates an empty notes snapshot. See [Notes](docs/notes.md) for the
manifest contract, local setup, audio behavior, and publication hook.

The complete setup and first-rollout sequence are in [CI and production setup](docs/deployment.md).

## Continuous delivery

GitHub Actions uses the pinned Node version and a neutral fixture owner. It runs
formatting, lint, deterministic tests, a real Redis adapter check, production
environment validation, TypeScript, Docker Compose validation, and a fixture-backed
production build on every push and pull request.

A passing push to `main` migrates and verifies the production database before triggering the Vercel Deploy Hook.
Configure `VERCEL_DEPLOY_HOOK_URL` in the protected GitHub `production`
environment, together with a direct `DATABASE_URL_UNPOOLED`. Scheduled project reconciliation uses the same migration gate and deploy hook. See [Guestbook](docs/guestbook.md) for the destructive legacy migration and owner moderation.
`vercel.json` disables automatic Git deployments. These workflows are the approved
Portfolio delivery path. The Notes workflow may call the same dedicated Deploy
Hook after publishing its manifest.

## Structure

- `src/app` contains routes, metadata files, and global styles.
- `src/components` contains reusable UI.
- `src/features` groups guestbook, role-fit and meeting-scheduling code by capability.
- `src/db` contains the shared Drizzle client and guestbook schema.
- `tests/` contains deterministic tests and integration helpers; `scripts/` contains operational commands.
- `src/config/site.ts` is the canonical public identity and site configuration.
- `src/content/portfolio.ts` contains profile details, social links, and project loading.
- `src/content/github-projects.ts` validates the build-time GitHub snapshot.
- `src/content/notes.ts` validates the build-time published notes snapshot.
- `scripts/sync-github-projects.mjs` reconciles public convention files into the snapshot.
- `public/` and project configuration remain at the repository root.

## License

This project is available under the [MIT License](LICENSE).
