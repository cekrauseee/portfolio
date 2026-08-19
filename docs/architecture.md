# Architecture

## Overview

The project uses the Next.js App Router. `src/app` contains route composition,
HTTP endpoints, framework metadata, and global styles. Shared presentation lives
in `src/components`, while interactive capabilities and their integrations are
grouped under `src/features`. Portfolio content and site configuration remain
separate under `src/content` and `src/config`. Project synchronization happens
at build or development startup, never during a visitor request.

The home page and project case studies render from the validated build-time
snapshot with React Server Components. Client Components are
limited to the role-fit and meeting-scheduling forms. Node.js Route Handlers connect those forms to OpenAI,
Google Calendar, and Resend. Tailwind CSS provides component styling;
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

## Data Flow

`src/content/portfolio.ts` exports the validated project records loaded from
`.cache/github-projects.json`. A valid
empty snapshot is accepted, so removing every convention file removes all
project routes on the next build. Server Components use the resulting records
to render `/` and `/projects/[slug]`.
`generateStaticParams` pre-renders every case study, and the sitemap derives its
project URLs from the same array. The role-fit feature builds its assessment
context from that content instead of maintaining a second candidate profile.

The `/fit` and `/schedule` forms send JSON to Node.js Route Handlers. Validation
occurs again on the server before any external API request. Browser state stays
inside the two feature forms; portfolio pages do not require hydration.

## Role-fit assessment

`POST /api/fit` accepts a `description` string of up to 16,000 characters. The
feature builds its candidate context from the same project records used by the
portfolio pages. It treats the submitted role description as untrusted content,
requests a concise plain-text assessment in the same language, and disables
OpenAI response storage.

The handler returns `400` for invalid input, `503` when `OPENAI_API_KEY` is not
configured, and `502` when the upstream assessment fails. It does not persist
the role description or assessment in application storage.
BotID protects this POST path. Strict streamed JSON limits apply, and shared
Upstash Redis keys use only HMAC hashes of an opaque session plus trusted Vercel
client IP; production fails closed when protection configuration is missing.
Development uses the same Redis operations through a local `REDIS_URL` adapter;
production ignores that variable and requires Vercel or direct Upstash REST
credentials.

## Meeting scheduling

`POST /api/meetings` is a Node.js Route Handler. It accepts `name`, `email`,
`start`, and `timeZone`, where `start` is a local ISO wall-clock value aligned
to a whole hour (for example, `2026-08-20T14:00`) and `timeZone` is an IANA time
zone. The handler validates the input and future time, converts it to UTC for a
Google Calendar `freeBusy` query, and rejects an overlap with `409`.

For an available slot it creates a private one-hour event on the configured
calendar with the guest attendee, `sendUpdates=all`, and a unique Google Meet
conference request. Guests cannot invite others, modify the event, or see other
guests. Google sends the calendar invitation to the guest; Resend sends a plain
text notification to the owner. There is intentionally no application database;
Redis stores only short-lived HMAC-derived counters, locks, and dedupe state.
The client supplies an idempotency key; the server hashes it and uses a
UTC-slot lock plus identity lock before freeBusy. Deterministic event and
conference IDs allow duplicate inserts to be replayed without resending the
owner notification. Rate-limit responses include `Retry-After` and are
rendered inline by the forms.

## Invariants

- The home page remains a Server Component and does not require hydration.
- Content changes belong in `src/content/portfolio.ts`, not duplicated across
  components or prompts.
- Shared UI belongs in `src/components`; capability-specific UI and integration
  code belong in `src/features`.
- Internal navigation uses Next.js `Link`. External navigation uses native
  anchors with `target="_blank"` and `rel="noreferrer"`; email uses a native
  `mailto:` link.
- Cards remain fully clickable and keyboard focus remains visible.
- Mobile layout respects safe-area insets and avoids horizontal overflow.
- Component styling uses Tailwind utilities; global CSS stays limited to
  application-wide tokens and defaults.
