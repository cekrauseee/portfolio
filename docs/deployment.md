# CI and production setup

The portfolio is the Next.js application; `cekrauseee/notes` owns Markdown and
audio publication. `cekrauseee/harness` distributes Continuity skills and is a
development tool, with no role in application CI or production. The two content
repositories integrate through public GitHub files and an optional dispatch event.

## Pull request CI

Enable GitHub Actions and allow the actions referenced in
[ci.yml](../.github/workflows/ci.yml). Require its **Quality checks** status on
`main`. CI needs no production credentials: it uses neutral fixtures, mocked API
providers, and disposable Redis/Postgres services. Both repositories use
Node.js 22.23.2 and npm 10.9.8 with their committed npm lockfiles.

Portfolio CI checks formatting, ESLint, TypeScript, deterministic tests, migration
history, real Redis/Postgres adapters, Compose configuration, and a production
build. `notes` CI checks formatting, ESLint, TypeScript, mocked provider tests,
and all three Markdown translations. A passing check does not validate live
provider credentials, listening quality, browser behavior, or production data.

`PROJECTS_SYNC_SKIP=1` and `NOTES_SYNC_SKIP=1` belong only to fixture-backed CI
builds. Do not set either variable in the Vercel production environment.

## Portfolio: GitHub delivery

The delivery workflows map the existing direct database secret into the
`DATABASE_URL` environment variable consumed by Drizzle:

| Secret                   | Value                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL_UNPOOLED`  | Direct Neon Postgres connection string, including its SSL settings; use the database/schema serving the portfolio. |
| `VERCEL_DEPLOY_HOOK_URL` | Vercel Deploy Hook for this project's `main` branch. Treat the URL as a secret.                                    |

Repository secrets work, but production credentials should be scoped to the
GitHub **production** environment. Configure that environment to accept `main`
only and require an owner approval before the first destructive rollout. Merely
naming an environment does not configure branch restrictions or approvals.

Keep the Vercel GitHub connection and a Deploy Hook targeting `main`.
[vercel.json](../vercel.json) disables automatic Git deployments. Approved
workflows run `db:check`, `db:migrate`, and `db:verify` before invoking the hook.
A successful hook request means the build was queued; inspect the resulting
Vercel deployment for `READY` and verify the public site before declaring a
release successful. A failed Vercel build is not automatically reflected by
the hook step's exit code.

### First guestbook rollout

This feature branch replaces the geographic guestbook. The new migration drops
`public.messages`; it does not copy legacy messages into `guestbook_messages`.
Before merging or manually reconciling this revision:

1. Back up the production database and inspect its migration ledger and legacy table.
2. Plan a staged removal of the old guestbook, or an explicit maintenance window.
   The currently deployed globe-dependent code must stop serving requests before
   the migration drops its table. The new workflows migrate before deployment.
3. Approve the destructive migration only after that transition is in place.
4. Let the approved delivery workflow migrate, verify, and trigger the new build.
5. Confirm the resulting deployment and guestbook reads/publication. A rollback
   to globe-dependent code requires restoring the legacy database state.

See [Guestbook](guestbook.md#migration-and-delivery) for the exact data contract.
Do not apply this migration simply to check credentials or to test this PR.

## Portfolio: Vercel

Use the existing `portfolio` project, the **Next.js** framework preset, repository
root as Root Directory, `npm ci` for installation and `npm run build` for builds.
Use Node.js **22.x** in project settings to match `package.json`. Vercel's
[version selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
honors `engines.node` over the dashboard and manages the patch release; `.nvmrc`
pins the exact local/CI version. Do not configure a static export.

Set these server-side variables in **Production**. Configure separate credentials
and a separate database for any preview environment that you later enable.

| Variable                                                           | Requirement                                                                                                             |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_OWNER`                                                     | `cekrauseee`; project discovery scans public repositories for `.portfolio/project.md`.                                  |
| `GITHUB_TOKEN`                                                     | Optional token for a higher API rate limit and read access to public content.                                           |
| `NOTES_REPOSITORY`                                                 | `cekrauseee/notes` to enable the published catalog. Unset means no notes.                                               |
| `NOTES_REF`                                                        | `main`, unless intentionally pinning a published revision.                                                              |
| `DATABASE_URL`                                                     | Neon Postgres runtime connection string. Production currently uses the Neon HTTP driver.                                |
| `KV_REST_API_URL`                                                  | Upstash REST HTTPS endpoint.                                                                                            |
| `KV_REST_API_TOKEN`                                                | Upstash **write-capable** REST token; the read-only token is insufficient.                                              |
| `ANON_SESSION_SECRET`                                              | Random secret of at least 32 characters, stable across deployments.                                                     |
| `OPENAI_API_KEY`                                                   | Project key with Responses API access to the models configured in `src/features/role-fit` and `src/features/guestbook`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | OAuth credentials for the calendar owner.                                                                               |
| `GOOGLE_CALENDAR_ID`                                               | Optional; defaults to the authenticated owner's primary calendar.                                                       |
| `RESEND_API_KEY`, `MEETING_OWNER_EMAIL`, `RESEND_FROM_EMAIL`       | Optional all-or-none group. Use a verified sending domain/address.                                                      |

`REDIS_URL` and `NOTES_LOCAL_PATH` are local development settings. Production
uses Upstash REST and the public notes repository. `PROJECTS_SOURCE` and
`MEETING_OWNER_NAME` are obsolete; current code uses GitHub reconciliation and
`src/config/site.ts`. No ElevenLabs or Blob write credential belongs in the
portfolio. Notes assets must be publicly readable Vercel Blob HTTPS URLs.

Configure the remaining provider settings:

- **Google:** enable Calendar API, authorize the owner with the two scopes and
  loopback redirect documented in [Meeting scheduling](modules/meeting-scheduling.md#local-authorization),
  and use an OAuth app in production status. Testing-mode refresh tokens can expire.
- **Vercel:** confirm `cekrause.eu` and `www.cekrause.eu`, their DNS, HTTPS, and
  the canonical hostname matching `src/config/site.ts`.
- **Bot protection:** configure [BotID](https://vercel.com/docs/botid/get-started)
  and WAF rules for `POST /api/fit`, `POST /api/meetings`, and `POST /api/guestbook`.
  Review any paid detection option before enabling it.
- **OpenAI:** ensure billing, configured-model access, rate limits, and spending
  controls. [Project spending limits](https://developers.openai.com/api/docs/guides/spend-limits)
  may not take effect immediately; alerts alone do not stop requests.
- **Observability:** enable the Vercel Analytics and Speed Insights features if
  their existing client integrations should collect data; inspect Runtime Logs
  by operation ID when a public action fails.

## Notes publication

Publishing the public GitHub repository does not publish narration. The initial
`.notes/manifest.json` is a valid empty catalog, so the portfolio can synchronize
it before audio services are configured. Markdown is public on GitHub immediately,
including any committed draft, but the portfolio lists only manifest entries.

The audio workflow is disabled unless the repository variable
`NOTES_PUBLICATION_ENABLED` equals `true`. Leave it unset for repository-only
publication. Enabling it permits paid generation and Blob upload on relevant
pushes and manual runs on `main`.

For later audio publication, configure the **notes repository's** Actions settings:

| Kind      | Name                                                                         | Requirement                                                         |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Secret    | `ELEVENLABS_API_KEY`                                                         | Text-to-speech access and available credits.                        |
| Secret    | `BLOB_READ_WRITE_TOKEN`                                                      | Read/write token for an existing **public** Vercel Blob store.      |
| Variables | `ELEVENLABS_VOICE_ID_EN`, `ELEVENLABS_VOICE_ID_PT`, `ELEVENLABS_VOICE_ID_JA` | Selected voice IDs for each language.                               |
| Variables | `ELEVENLABS_MODEL_ID`, `ELEVENLABS_SPEED`                                    | Optional; defaults are `eleven_multilingual_v2` and `0.95`.         |
| Variable  | `NOTES_BLOB_PREFIX`                                                          | Optional; defaults to `notes`.                                      |
| Variable  | `NOTES_PUBLICATION_ENABLED`                                                  | `true` only when ready to run paid publication.                     |
| Secret    | `VERCEL_DEPLOY_HOOK_URL`                                                     | Optional Deploy Hook URL for the Portfolio `main` production build. |

Allow the workflow's `GITHUB_TOKEN` to push its manifest commit to `notes/main`
under the chosen branch policy. After that push, the Notes workflow can call the
same Portfolio Deploy Hook directly. No GitHub repository-dispatch token or
receiver workflow is required; the Vercel build resolves `NOTES_REF` itself and
may consume a newer published revision.

Follow the notes repository's [publication procedure](https://github.com/cekrauseee/notes/blob/main/docs/publishing.md)
for listening checks, retries, and manifest publication. No ffmpeg, database,
Redis, Google OAuth, OpenAI key, or Vercel application deployment is required for
the notes repository itself.
