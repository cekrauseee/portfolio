# Architecture

## Overview

The project uses the Next.js App Router. `src/app` contains route composition,
HTTP endpoints, framework metadata, and global styles. Shared presentation lives
in `src/components`, while interactive capabilities and integrations are grouped
under `src/features`. Portfolio content and site configuration remain separate
under `src/content` and `src/config`. Project synchronization happens at build or
development startup, never during a visitor request.

The home page and project case studies render from a validated build-time
snapshot with React Server Components. Client Components are limited to the
role-fit and meeting-scheduling forms. Node.js Route Handlers connect those forms
to OpenAI, Google Calendar, and Resend. Tailwind CSS provides component styling;
`src/app/globals.css` contains only global tokens and defaults.

## Components

| Path                                    | Responsibility                                                   |
| --------------------------------------- | ---------------------------------------------------------------- |
| `src/app`                               | Pages, Route Handlers, metadata, and global styles               |
| `src/components`                        | Shared page shell, navigation, project list, and link primitives |
| `src/features/role-fit`                 | Role-fit form, input parsing, prompt context, and OpenAI request |
| `src/features/meeting-scheduling`       | Scheduling form, validation, calendar access, and notification   |
| `src/content/portfolio.ts`              | Profile, social links, and normalized project contract           |
| `src/content/project.ts`                | Shared `Project` and `ProjectSection` types                      |
| `src/content/github-projects.ts`        | Validated build-time snapshot loader                             |
| `src/lib/abuse-protection.ts`           | Bot checks, identities, rate limits, locks, and Redis selection  |
| `scripts/sync-github-projects.mjs`      | Paginated GitHub reconciliation and atomic snapshot writer       |
| `src/config/site.ts`                    | Site identity and canonical URL configuration                    |
| `scripts/authorize-google-calendar.mjs` | Local Google Calendar OAuth authorization                        |

## Data flow

`src/content/portfolio.ts` exports validated project records loaded from
`.cache/github-projects.json`. A valid empty snapshot is accepted, so removing
every convention file removes all project routes on the next build. Server
Components render `/` and `/projects/[slug]`; `generateStaticParams` pre-renders
every case study, and the sitemap derives URLs from the same array. The role-fit
feature builds its assessment context from those records instead of maintaining
a second candidate profile.

The `/fit` and `/schedule` forms send JSON to Node.js Route Handlers. Validation
occurs again on the server before any external API request. Browser state remains
inside the two feature forms; portfolio pages do not require hydration.

## Shared protection

BotID runs before both sensitive POST operations. A canonical signed anonymous
cookie and the trusted Vercel client IP are HMACed into privacy-safe identifiers.
Separate per-session and higher aggregate per-IP buckets limit both ten-minute
bursts and daily usage. Redis increments are atomic Lua operations with repaired
TTLs, while locks use owner tokens and compare-and-delete release scripts.

Local development uses the Redis service at `REDIS_URL`; production ignores that
variable and accepts only `KV_REST_API_URL` plus `KV_REST_API_TOKEN` from the
Vercel Marketplace. Missing credentials, failed storage, missing production
session secrets, and BotID failures return `503` before OpenAI or Calendar is
called. The ordinary runtime has no in-memory fallback.

Request bodies are streamed into bounded buffers. The role-fit allowance is
large enough for its documented 16,000-character input even when characters use
multi-byte UTF-8 encoding. Rate-limit and outage responses include `Retry-After`
and both forms render that guidance.

## Role-fit assessment

`POST /api/fit` accepts a `description` string of up to 16,000 characters. The
feature uses the same project records as the portfolio, treats the submitted job
description as untrusted content, requests a concise plain-text assessment in
the same language, disables OpenAI response storage, and sends only the HMACed
anonymous identity as the OpenAI safety identifier.

The endpoint serializes one assessment per identity with a Redis lock. It returns
`400` for invalid input, `429` for limits or concurrent work, `503` for missing
configuration or protection storage, and `502` for an upstream assessment
failure. It does not persist the submitted description or result.

## Meeting scheduling

`POST /api/meetings` accepts `name`, `email`, `start`, and `timeZone`, where
`start` is a future local ISO wall-clock value aligned to a whole hour and
`timeZone` is an IANA zone. It also requires an `Idempotency-Key`. The server
normalizes the input, converts the slot to UTC, HMACs both the idempotency key and
canonical request, and acquires operation, anonymous-identity, and UTC-slot locks
before scheduling.

The browser retains one idempotency key for the canonical payload in
`sessionStorage` and memory. Retryable network, rate-limit, and temporary-outage
failures therefore repeat the same operation even across a reload. A successful
booking, a real slot conflict, or a changed payload rotates the key.

For an available slot, Google Calendar receives a deterministic event ID and
conference request ID. The event also carries private application, schema,
idempotency-digest, and request-digest properties. Existing event links are
returned only when ID, time, attendee, and all private metadata match. A
same-slot request with another key or payload receives a generic conflict rather
than the existing Meet or Calendar link. Cancelled deterministic events are not
replayed; the organizer copy is restored with fresh event contents and metadata.

Google sends the private one-hour invitation to the guest with
`sendUpdates=all`; guests cannot invite others, modify the event, or see other
guests. Resend sends a plain-text notification to the owner only after a newly
created or restored event. Redis stores only short-lived HMAC-derived counters,
locks, and versioned dedupe results. Deterministic Calendar recovery covers the
ambiguous-success case where event creation succeeds but dedupe persistence or
the HTTP response fails.

## Invariants

- The home page remains a Server Component and does not require hydration.
- Content changes belong in `src/content/portfolio.ts`, not duplicated across
  components or prompts.
- Shared UI belongs in `src/components`; capability-specific UI and integration
  code belong in `src/features`.
- Protected operations fail closed without their shared Redis storage.
- Calendar replay requires the original operation metadata and never authorizes
  access based only on a slot or attendee email.
- Internal navigation uses Next.js `Link`. External navigation uses native
  anchors with `target="_blank"` and `rel="noreferrer"`; email uses a native
  `mailto:` link.
- Cards remain fully clickable and keyboard focus remains visible.
- Mobile layout respects safe-area insets and avoids horizontal overflow.
- Component styling uses Tailwind utilities; global CSS stays limited to
  application-wide tokens and defaults.
