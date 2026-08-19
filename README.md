# portfolio

A terminal-inspired personal portfolio built with Next.js and Tailwind CSS. It
combines statically rendered project case studies with focused tools for role-fit
assessment and meeting scheduling.

## Features

- statically rendered, indexable project case studies;
- role-fit assessments grounded in the published portfolio content;
- one-hour meeting scheduling with Google Calendar and Google Meet;
- bot detection, shared rate limits, concurrency locks, and replay-safe public actions;
- responsive light and dark layouts with accessible keyboard interactions;
- canonical metadata, structured data, sitemap, and social previews;
- optional build-time project records reconciled from public GitHub repositories.

## Development

Copy the example environment file, set the GitHub account to scan, prepare the
local Docker Redis service, and start the server:

```bash
cp .env.example .env.local
# Set GITHUB_OWNER in .env.local.
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The static portfolio does not require hosted services. Role-fit assessment
requires `OPENAI_API_KEY`; meeting scheduling requires Google Calendar OAuth and
Resend configuration. Protected API actions require Redis. Local development
uses `REDIS_URL` with the Docker Compose service created by `npm run setup`.

Production deployments must connect Upstash through the Vercel Marketplace,
which injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`, and must configure a
strong `ANON_SESSION_SECRET`. Configure BotID, Vercel WAF rules, and an OpenAI
project hard-spend limit with alerts before enabling public traffic. See
[Development](docs/development.md) for the complete setup.

Project case studies come from the validated `.cache/github-projects.json`
snapshot. `npm run dev` and `npm run build` refresh it by scanning public
repositories owned by the explicitly configured `GITHUB_OWNER` and reading
`.portfolio/project.json` from each default branch. Use
`npm run projects:sync` to refresh or inspect the snapshot directly.

## Continuous delivery

GitHub Actions runs formatting, lint, unit and integration tests, a real Redis
adapter check, TypeScript, Docker Compose validation, and a production build on
every push and pull request. A passing push to `main` then triggers the Vercel
Deploy Hook stored in the `VERCEL_DEPLOY_HOOK_URL` GitHub Actions secret.

Disable Vercel's Git-based automatic deployments before enabling this workflow;
the deploy hook becomes the sole production deployment trigger. The committed
`vercel.json` uses `git.deploymentEnabled: false` for this. Keep the Git
repository connected, and do not use the legacy `github.enabled: false` setting:
Vercel Deploy Hooks require that integration to remain enabled.

## Structure

- `src/app` contains routes, metadata files, and global styles.
- `src/components` contains reusable UI.
- `src/features` groups role-fit and meeting-scheduling code by capability.
- `src/content/portfolio.ts` keeps profile, social, and the normalized Project contract together.
- `src/content/github-projects.ts` validates the build-time GitHub snapshot.
- `scripts/sync-github-projects.mjs` reconciles convention files into the ignored `.cache/github-projects.json` snapshot.
- `src/config/site.ts` keeps site-wide configuration.
- `public/` and project configuration remain at the repository root.

Read the [developer documentation](docs/index.md) for project boundaries,
architecture, and contribution guidance.

## License

This project is available under the [MIT License](LICENSE).
