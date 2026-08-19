# portfolio

A terminal-inspired personal portfolio built with Next.js and Tailwind CSS. It
combines statically rendered project case studies with focused tools for role-fit
assessment and meeting scheduling.

## Features

- statically rendered, indexable project case studies;
- role-fit assessments grounded in the published portfolio content;
- one-hour meeting scheduling with Google Calendar and Google Meet;
- responsive light and dark layouts with accessible keyboard interactions;
- canonical metadata, structured data, sitemap, and social previews.
- optional build-time project records reconciled from public GitHub repositories.

## Development

Install dependencies and start the local server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The portfolio and case studies work without external services. Role-fit
assessment requires `OPENAI_API_KEY`; meeting scheduling requires Google Calendar
OAuth credentials and Resend configuration. See
[Development](docs/development.md) for setup details.

Production deployments must also configure BotID, Upstash Redis, and
`ANON_SESSION_SECRET`. Configure Vercel WAF rules and an OpenAI project hard
spend limit with alerts outside this repository before enabling public traffic.

Project case studies come from the validated `.cache/github-projects.json`
snapshot. `npm run dev` and `npm run build` refresh it automatically by scanning
public repositories owned by `GITHUB_OWNER` (default `cekrauseee`) and reading
`.portfolio/project.json` from each default branch. Use `npm run projects:sync`
when you want to refresh or inspect the snapshot explicitly.

See [Development](docs/development.md) for the complete command catalog,
integration setup, testing, and CI details.

## Continuous delivery

GitHub Actions runs formatting, lint, TypeScript, and production-build checks on
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
