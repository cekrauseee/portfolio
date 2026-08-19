# Architecture

## Overview

The project uses the Next.js App Router. Pages and HTTP endpoints live under
`src/app`; shared presentation lives under `src/components`; capability-specific
code lives under `src/features`. Site identity is canonical in
`src/config/site.ts`, while `src/content/portfolio.ts` adds profile details,
social links, and the validated project snapshot.

The home page and project case studies are React Server Components. Only the
role-fit and meeting forms cross a client boundary. Project synchronization runs
at development startup or build time and never during visitor requests.

## Build-time project content

Public repositories owned by the explicit `GITHUB_OWNER` opt in with
`.portfolio/project.json`. The sync paginates GitHub, rejects private repositories,
validates each exact project record, deduplicates immutable repository identities
and slugs, sorts deterministically, and atomically replaces
`.cache/github-projects.json`.

The snapshot loader revalidates the complete file and binds it to the configured
owner. Writer and reader both require a string slug matching the same safe
pattern. Tests create their snapshot from a neutral committed fixture, removing
hidden dependence on prior local commands.

## Shared protection

BotID runs before both sensitive POST operations. A canonical signed anonymous
cookie and trusted Vercel client IP are HMACed into privacy-safe identities.
Separate per-session and higher aggregate per-IP buckets limit ten-minute bursts
and daily usage.

Redis increments are atomic Lua operations with repaired TTLs. Locks use random
owner tokens and compare-and-delete releases. Production accepts only the
Vercel Marketplace `KV_REST_API_URL` and `KV_REST_API_TOKEN`; local development
uses the loopback `REDIS_URL`. There is no in-memory runtime fallback.

Missing or failed protection dependencies return `503` before OpenAI or Calendar
is called. Temporary protection responses carry `Retry-After`; configuration
errors do not, allowing the UI to distinguish retryable outages from deployment
misconfiguration.

## Role-fit assessment

The role-fit client and server import one shared 16,000-character limit. The
server treats the job description as untrusted input and builds candidate context
from the same project records rendered by the site. OpenAI response storage is
disabled and only the HMACed identity is sent as a safety identifier.

The OpenAI client has an explicit deadline and disables automatic SDK retries.
The per-identity Redis lock is derived from that deadline with an additional
margin, preventing a lock from expiring while the bounded operation is still
running.

## Meeting scheduling

The browser fingerprints the normalized meeting payload and stores one UUID
idempotency key in memory and `sessionStorage`. Network failures, rate limits,
and temporary outages reuse that key even across a reload. Success, a real
conflict, or a changed payload rotates it.

The server HMACs the idempotency key and canonical request, then acquires locks
for the operation, anonymous identity, and UTC slot. Lock TTL is derived from a
conservative upper bound for all bounded Calendar requests, conference polling,
and optional notification work.

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
secret strength, URLs, and optional groups before project synchronization or
compilation. Runtime guards remain fail closed, but ordinary deployment mistakes
are rejected during the build.

Node.js is pinned through `.nvmrc`, `package.json`, `.npmrc`, CI, and matching
Node type definitions. Local setup uses `npm ci`, so dependency installation is
reproducible from the committed lockfile.

## Invariants

- Visitor requests never call GitHub.
- Protected operations never continue without shared Redis storage.
- Calendar replay never authorizes access based only on a slot or attendee email.
- External work has deadlines shorter than the locks that serialize it.
- Resend configuration is either complete or absent.
- The Calendar event remains successful even when the optional extra email fails.
- Site identity has one canonical public-name source.
- Client-side JavaScript is limited to features that require browser state.
- Internal navigation uses Next.js `Link`; external navigation uses safe native anchors.
- Mobile layout preserves keyboard focus, safe-area insets, and no horizontal overflow.
