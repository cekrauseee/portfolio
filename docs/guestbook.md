# Guestbook

The public guestbook opens in the homepage action panel alongside scheduling and
role comparison. It has no login, location, avatars, replies or private messages.
Messages are the primary content. The form stays mounted in a nested disclosure
below them, collapsed by default, so its draft survives closing and reopening.
It accepts a name or nickname (up to 80 characters) and a plain-text message (up
to 500); its vertically resizable message field stops at 16rem. Interface copy
is localized; visitor content retains its casing and original language. The
guestbook does not duplicate the homepage's existing private email contact.

## Reading and publishing

`GET /api/guestbook` returns five visible messages, newest first, an opaque
`nextCursor` or `null`, and `rememberedName`. Further requests pass `?cursor=...`.
The cursor contains the last message's UTC millisecond timestamp and UUID. A
partial compound index supports this seek query; each read fetches at most six
rows. Inserts or deletion of the boundary message do not shift older pages.
There is no total-count query, unbounded initial fetch, or nested scrolling area.
Messages accumulate in the page only when the visitor chooses to load more.

### Local seed

`npm run guestbook:seed` loads `DATABASE_URL` and inserts thirteen curated
messages directly into Postgres, enough for three pages. Fixed private
submission keys make the operation idempotent; re-running it reports the
entries as skipped without changing their timestamps. The script is disabled
in production and refuses any database whose hostname is not loopback.

`POST /api/guestbook` accepts `{ name, message, submissionId }`, where
`submissionId` is a client-generated UUID retained when retrying the same payload.
It returns `{ message }` only after the database confirms persistence. A unique
private HMAC submission key prevents duplicate rows on uncertain retries, even
when the first response's anonymous-session cookie was lost. Reusing the key for
a different payload is rejected. Public IDs do not reveal submission keys.

Confirmed publication automatically writes the `guestbook_name` cookie for one
year, with `HttpOnly`, `SameSite=Lax`, and `Secure` in production. It remembers only
the editable name and has no opt-in. It grants no identity or editing rights.
Responses are `private, no-store` because they can contain the remembered name.
The existing signed anonymous-session cookie remains separate and supports abuse
protection; raw IP addresses are not saved in guestbook rows.

BotID, JSON size limits, per-session/IP rate limits, and a concurrency lock run
before moderation. Publication uses the existing OpenAI SDK's Responses API with
a typed boolean result and `store: false`. The short prompt in
`src/features/guestbook/guard-message.ts` rejects only clearly extreme content;
it explicitly allows criticism, disagreement, profanity, jokes and any language.
The model is `gpt-5.6-luna`, matching the existing role-fit guardrail, with a
20-second timeout and no automatic retries. Failure or incomplete output returns
a retryable error and does not publish. The visitor's draft is retained.

Operation logs contain stages, timings, status, lengths and safe diagnostics,
never submitted names, messages, cookies or raw IP addresses.

## Owner moderation

No public administration endpoint is exposed. With the intended `DATABASE_URL`
configured, use the private database tooling to inspect messages and copy an ID:

```bash
npm run db:studio
npm run guestbook:moderate -- hide <message-uuid>
npm run guestbook:moderate -- restore <message-uuid>
```

Hiding is reversible and excludes the entry from subsequent reads and retry
responses. Its retry key stays in the database so a delayed retry cannot
republish a removed entry. There is no permanent-delete command. An already
open visitor page is not pushed moderation updates; reloading the page and
opening the guestbook reflects the current database. Database access credentials are the administration
boundary. Running any of these commands against production requires authorization.

## Migration and delivery

`src/db/schema.ts` declares `guestbook_messages`, including `hidden_at`, a unique
submission key, length constraints, and the visible-message pagination index.

The original `20260822152514_init` migration and snapshot are kept byte-for-byte
as migration history. They are needed to reconcile databases which already
applied that migration, including Drizzle's older migration-ledger format. They
do not restore the old feature. The new replacement migration creates the new
table and drops only `public.messages`, after checking its legacy columns. It
uses no `CASCADE`, does not reset schemas or delete the migration ledger, and
limits lock/statement waits. The old entries are intentionally not copied.

Review the actual production schema and retain a backup before authorizing the
first destructive rollout. The deployed version must already have stopped using
`messages`; otherwise first deploy the removal of the globe feature. A rollback
to a globe-dependent version needs a database restore. This implementation does
not execute production migrations or deployments.

Both approved GitHub delivery workflows validate migration history, apply
migrations and verify the schema before invoking the deployment hook. Configure
a **direct** `DATABASE_URL_UNPOOLED` in the protected GitHub `production` environment,
alongside the existing deploy-hook secret. Vercel also requires the runtime
`DATABASE_URL`. Do not use `db:push` to replace migration history.

For local development, `npm run setup` applies and verifies the migrations after
starting Postgres. `npm run test:postgres` creates and removes isolated test
databases on a loopback host; it tests fresh and legacy upgrades, ledger
continuity, pagination under concurrent insertion/deletion, retries and owner
moderation. It leaves the selected development database's tables untouched.

## API references

The implementation follows the installed SDK and Drizzle versions, with
[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Drizzle migration generation](https://orm.drizzle.team/docs/drizzle-kit-generate),
and [Postgres indexes in Drizzle](https://orm.drizzle.team/docs/indexes-constraints).
