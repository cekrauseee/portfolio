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

## Commands

| Command                             | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| `npm run dev`                       | Start the development server         |
| `npm run build`                     | Create a production build            |
| `npm run start`                     | Serve the production build           |
| `npm run google-calendar:authorize` | Authorize the meeting calendar owner |
| `npm run format`                    | Format supported files               |
| `npm run format:check`              | Check formatting without writing     |
| `npm run lint`                      | Run ESLint                           |
| `npm run typecheck`                 | Check TypeScript types               |

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
- `src/content/portfolio.ts` keeps profile, social, and project content together.
- `src/config/site.ts` keeps site-wide configuration.
- `public/` and project configuration remain at the repository root.

Read the [developer documentation](docs/index.md) for project boundaries,
architecture, and contribution guidance.

## License

This project is available under the [MIT License](LICENSE).
