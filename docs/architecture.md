# Architecture

## Overview

The project uses the Next.js App Router. Pages and HTTP endpoints live under
`src/app`; shared presentation lives under `src/components`; capability-specific
code lives under `src/features`. Site identity is canonical in
`src/config/site.ts`, while `src/content/portfolio.ts` adds profile details,
social links, and the validated project snapshot.

The home page is a React Server Component with small client islands for project
expansion, viewport stabilization, and preferences. Project Markdown is rendered
on the server and passed into the collapsible project list. Interactive forms and
the guestbook globe also cross client boundaries. The guestbook keeps serializable
message contracts in `src/features/guestbook/message.ts`; persistence, cache,
geolocation, moderation, and HTTP orchestration stay under
`src/features/guestbook/server`. Project synchronization runs at development
startup or build time and never during visitor requests.

## Internationalization

The site supports `en`, `pt-BR`, and `ja` while keeping stable, unprefixed URLs
for every route. Locale is request state, not URL state. A valid explicit
preference in the one-year, `SameSite=Lax` `portfolio-locale` cookie wins over
the trusted deployment country (`JP` or a configured Portuguese-speaking
country), then supported `Accept-Language`, then English. The shared inline
preferences submit a Server Action that validates the locale and sets the
`HttpOnly` cookie. Next.js then re-renders the current route in the same
roundtrip. There
are no locale paths, Proxy, locale API, or `localStorage` state.

Each request resolves a locale on the server and loads its typed, server-only
dictionary. The layout sets `<html lang>` and route metadata from that locale;
`pt` uses the `pt-BR` language tag. Client components receive only the
serializable dictionary subsets they need. Synchronized project records can
provide `en`, `pt`, and `ja` editorial translations. English is required and is
the fallback when a requested translation is absent; the rendered content keeps
its actual language tag.

Canonical metadata and the sitemap emit one URL per route. They do not emit
`hreflang` variants because language is stateful rather than represented by
separate URLs.

## Theme

Theme defaults to `system` and persists in the readable, one-year
`portfolio-theme` cookie. The head script applies the effective `dark` class
before paint; client preference changes and live system changes update the
browser theme color immediately. Existing dark utilities and WebGL colors follow
that effective theme.

## Components

| Path                                    | Responsibility                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/app`                               | Pages, Route Handlers, metadata, and global styles                                        |
| `src/components`                        | Shared 36rem page shell, navigation, settings controls, project list, and link primitives |
| `src/i18n`                              | Request locale resolution, typed server dictionaries, and locale metadata                 |
| `src/theme`                             | Theme preference, effective class, browser color, persistence, and live updates           |
| `src/features/role-fit`                 | Role-fit form, input parsing, prompt context, and OpenAI request                          |
| `src/features/meeting-scheduling`       | Scheduling form, validation, calendar access, and notification                            |
| `src/features/guestbook`                | Shared guestbook contracts, server integrations, and globe UI                             |
| `src/content/portfolio.ts`              | Profile, social links, and normalized project contract                                    |
| `src/content/project.ts`                | Shared project identity, translation, and Markdown content types                          |
| `src/content/github-projects.ts`        | Validated build-time snapshot loader                                                      |
| `src/lib/redis.ts`                      | Shared local and production Redis client selection                                        |
| `src/lib/abuse-protection.ts`           | Bot checks, identities, rate limits, locks, and deduplication                             |
| `scripts/sync-github-projects.mjs`      | Paginated GitHub reconciliation and atomic snapshot writer                                |
| `src/config/site.ts`                    | Site identity and canonical URL configuration                                             |
| `scripts/authorize-google-calendar.mjs` | Local Google Calendar OAuth authorization                                                 |

## Build-time project content

Public repositories owned by the explicit `GITHUB_OWNER` opt in with
`.portfolio/project.md`. The English file contains identity and editorial front
matter plus a Markdown body. Optional `.portfolio/project.pt.md` and
`.portfolio/project.ja.md` files contain localized editorial front matter and
body content. The sync paginates GitHub, rejects private repositories, validates
each record, deduplicates immutable repository identities and slugs, sorts
deterministically, and atomically replaces `.cache/github-projects.json`.

The snapshot loader revalidates the complete file and binds it to the configured
owner. Writer and reader both require a string slug matching the same safe
pattern. English is required; Portuguese and Japanese are optional. The
synchronizer temporarily accepts the previous JSON convention and converts its
sections to Markdown so repositories can migrate independently. The application
and snapshot contract use only the normalized Markdown body.

Project Markdown renders CommonMark on the server through controlled components
inside the home page's collapsible entries. Raw HTML is ignored. Relative image
paths resolve against the source repository, use `next/image`, and remain
restricted to the configured GitHub owner. Markdown bodies start at level-two
headings so their content nests under the home page's projects section.

There is no `/projects` index or dedicated project route. The unprefixed home URL
resolves locale from request cookies and headers; localized project content is
selected during that request and rendered into the same canonical page.

Tests create their snapshot from a neutral committed fixture, removing hidden
dependence on prior local commands.

## Shared protection

BotID runs before every sensitive POST operation. A canonical signed anonymous
cookie and trusted Vercel client IP are HMACed into privacy-safe identities.
Separate per-session and higher aggregate per-IP buckets limit ten-minute bursts
and daily usage.

Redis increments are atomic Lua operations with repaired TTLs. Locks use random
owner tokens and compare-and-delete releases. Production accepts only the
Vercel Marketplace `KV_REST_API_URL` and `KV_REST_API_TOKEN`; local development
uses the loopback `REDIS_URL`. There is no in-memory runtime fallback.

Missing or failed protection dependencies return `503` before OpenAI or Calendar
is called. Temporary protection responses can carry `Retry-After` as an HTTP
signal. Each UI maps stable error codes to localized guidance and never displays
the header's numeric value.

Zod schemas define the request and error-response boundaries for guestbook,
role-fit, and meeting scheduling. The same meeting name and email schemas are
used by client-side guidance and server validation. OpenAI guardrail decisions
use that same approach through the SDK's Zod-backed Structured Outputs parser;
prompts describe classification policy while the schema alone owns response
serialization.

## Guestbook and globe

Approved guestbook messages are persisted in Postgres and returned oldest first.
`/api/guestbook` is the canonical Route Handler; `/api/visitor-globe` remains a
thin compatibility adapter. The globe controller, scene primitives, geometry
calculations, and message overlays live in separate cohesive modules. When
browser geolocation permission is already granted, the message form submits
validated device coordinates. The server prefers those coordinates, falls back
to trusted Vercel IP-geolocation headers, and rejects the submission only when
neither source is valid. Device coordinates do not imply country or city labels,
so both remain null. A `prompt` permission state never triggers an automatic
browser prompt. The globe and message form share one consent-aware device
location module for permission policy, browser access, request options, and
coordinate validation.

OpenAI moderation uses a bounded request with automatic retries disabled and
fails closed before persistence when classification is unavailable. A five-minute
Redis snapshot caches the global message collection independently
of the request-specific viewer location. Each Redis cache command has a short
abortable deadline and does not retry, so a degraded cache cannot hold a
visitor request indefinitely. Successful inserts advance a generation key, so
concurrent readers cannot restore an obsolete snapshot after a write. Postgres
remains authoritative: cache read and fill failures fall back to the database
and never turn a committed message into a failed response. If cache
invalidation fails after a successful insert, readers can continue serving the
old snapshot until its five-minute TTL expires; the committed message is then
included when that snapshot is replaced. Cache failures emit structured Pino
events containing only a stage and sanitized error metadata. The deployed Redis
cache prefix and `visitorGlobe` abuse operation remain legacy identifiers
intentionally, avoiding cache and rate-limit migrations during the bounded-context
rename.

Guestbook failures return a stable error code and opaque operation ID instead of
internal exception text. Every submission emits one `guestbook_submission` wide
event after completion. The event records the terminal stage, outcome, status,
total and stage durations, protection and moderation decisions, safe provider
metadata, and cache invalidation state. It never records the submitted name or
message, coordinates, cookies, raw IP addresses, or safety identity. The event
records only `device`, `vercel`, or `unavailable` as its location source. Pino
emits structured JSON in production; local development uses `pino-pretty` for
the same event.

## Role-fit assessment

The role-fit client and server import one shared 16,000-character limit. The
server treats the job description as untrusted input and builds candidate context
from the same project records rendered by the site. OpenAI response storage is
disabled and only the HMACed identity is sent as a safety identifier.

Role-fit uses two independent `gpt-5.6-luna` Responses API calls. A 20-second
input guardrail first accepts genuine professional opportunities and rejects
prompt injection, task diversion, unrelated spam, and content without a
discernible opportunity. Only approved input reaches the 60-second evaluator,
which compares it with the published candidate profile. Both calls disable
response storage and automatic SDK retries and receive only the HMACed safety
identifier. The per-identity Redis lock covers both deadlines plus a margin.
Field validation and guardrail rejection remain distinct from operational
failures.

Each request returns stable error codes and an opaque operation ID. One
`fit_assessment` wide event records the terminal stage, outcome, protection and
lock decisions, separate guardrail and evaluator durations, and safe OpenAI
status, code, and request ID metadata. It never records the role description or
anonymous identity.

## Meeting scheduling

The browser fingerprints the normalized meeting payload and stores one UUID
idempotency key in memory and `sessionStorage`. Network failures, rate limits,
and temporary outages reuse that key even across a reload. Success, a real
conflict, or a changed payload rotates it.

The server HMACs the idempotency key and canonical request, then acquires locks
for the operation, anonymous identity, and UTC slot. Lock TTL is derived from a
conservative upper bound for all bounded Calendar requests, conference polling,
and optional notification work.

Client and server share the same name and email validation limits. Responses use
stable error codes and non-numeric retry guidance. One `meeting_scheduling` wide
event records the terminal stage, outcome, lock cleanup, replay and dedupe state,
Calendar duration, and owner-notification outcome without names, email addresses,
meeting times, links, or idempotency values.

Google Calendar receives a deterministic event ID, deterministic conference
request ID, and private application, schema, operation, and request metadata.
Existing links are returned only when ID, time, attendee, and all private metadata
match. Another operation targeting the slot receives a generic conflict. A
cancelled deterministic organizer event is restored with fresh contents instead
of replaying stale conference data.

Every Google API request has an explicit timeout. The Calendar invitation is the
authoritative booking result and is sent with `sendUpdates=all`; guests cannot
invite others, modify the event, or see other guests.

## Optional owner notification

Resend provides an optional extra owner email. Its three configuration variables
form one all-or-none group. When disabled, scheduling has no notification branch
or warning. When enabled, delivery is best effort, bounded by a deadline, and
uses a deterministic provider idempotency key. An ambiguous timeout may leave the
provider call in flight, but a retry cannot duplicate the message.

The public owner name comes from `src/config/site.ts` for metadata, Calendar text,
notification text, and the role-fit profile. No owner-name environment fallback
exists.

## Production configuration

The `prebuild` lifecycle validates all critical production environment variables,
including the Postgres connection, secret strength, URLs, and optional groups
before project synchronization or compilation. Runtime guards remain fail closed,
but ordinary deployment mistakes are rejected during the build.

Drizzle schema changes are represented by reviewed SQL and snapshots under
`drizzle/`. CI rejects schema changes without a committed migration. Both the
main-branch and scheduled production workflows serialize delivery, apply pending
migrations, verify the live schema, and only then invoke the Vercel Deploy Hook.
The database records applied migrations in the project-specific
`drizzle.__portfolio_migrations` log. Runtime database access preserves the
native Neon HTTP and node-postgres driver types behind their shared query API.
This guarantee applies to delivery initiated
by these workflows; Vercel dashboard, CLI, API, and direct Deploy Hook deployments
bypass the gate and are operationally prohibited.

Node.js is pinned through `.nvmrc`, `package.json`, `.npmrc`, CI, and matching
Node type definitions. Local setup uses `npm ci`, so dependency installation is
reproducible from the committed lockfile.

## Invariants

- Visitor requests never call GitHub.
- Locale selection never changes a public URL; each route has one canonical and sitemap URL, with no `hreflang` variants.
- The explicit language preference is the `portfolio-locale` cookie; locale state is not stored in `localStorage`.
- Theme defaults to `system`; `portfolio-theme` is a readable one-year cookie.
- Theme class application happens before paint, system preference changes update live, and dark utilities plus WebGL use the effective theme.
- The home page remains a Server Component; only interactive project and
  preference controls hydrate on the client.
- Projects have no dedicated route; their case studies expand inline on the home
  page.
- Content changes belong in `src/content/portfolio.ts`, not duplicated across
  components or prompts.
- Shared UI belongs in `src/components`; capability-specific UI and integration
  code belong in `src/features`.
- Protected operations never continue without shared Redis storage.
- Guestbook message caching fails open and keeps Postgres as its source of truth.
- Calendar replay requires the original operation metadata and never authorizes
  access based only on a slot or attendee email.
- External work has deadlines shorter than the locks that serialize it.
- Resend configuration is either complete or absent.
- The Calendar event remains successful even when the optional extra email fails.
- Site identity has one canonical public-name source.
- Client-side JavaScript is limited to features that require browser state.
- Internal navigation uses Next.js `Link`; external navigation uses safe native anchors.
- Cards remain fully clickable and keyboard focus remains visible.
- Mobile layout preserves keyboard focus, safe-area insets, and no horizontal overflow.
- Non-globe pages share one responsive 36rem maximum-width shell.
- Component styling uses Tailwind utilities; global CSS stays limited to
  application-wide tokens and defaults.
