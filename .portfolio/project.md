---
description: >-
  A terminal-inspired software engineering portfolio with localized case
  studies, role-fit assessment, and one-hour meeting scheduling.
metaDescription: >-
  Henrique Krause's software engineering portfolio with localized case studies,
  role-fit assessment, and one-hour Google Calendar and Google Meet scheduling.
summary: >-
  This portfolio presents selected software projects as localized, indexable
  case studies. Visitors can compare a role with the published experience and
  schedule a one-hour conversation.
highlights:
  - "Localized, indexable case studies"
  - Opt-in GitHub project records
  - Validated build-time snapshots
  - Role-fit assessment
  - One-hour Google Calendar and Meet scheduling
  - Bot detection and shared rate limits for public actions
  - Replay-safe calendar scheduling
  - Fail-fast production configuration
  - Docker-backed local development setup
  - SEO metadata and structured data
slug: portfolio
name: cekrause/portfolio
repositoryUrl: "https://github.com/cekrauseee/portfolio"
---

## Product

This portfolio brings a professional profile, contact links, and selected software projects into one compact interface.

Project pages are indexable and include localized metadata, structured data, sitemap entries, and social previews.

## What I built

Public repositories owned by the configured GitHub account opt in with a `.portfolio/project.json` record. The sync validates eligible records and their translations into a build-time snapshot.

The role-fit route uses the published project records as context, returns a concise plain-text assessment, and stores neither the submitted description nor the response.

Scheduling accepts a name, email, local whole-hour start, and time zone. It checks Google Calendar free/busy, creates a private one-hour event with a Google Meet conference request, sends the invitation, and optionally sends an idempotent best-effort owner notification through Resend.

## Engineering choices

Client Components are limited to interactive forms, while Node.js Route Handlers validate input before external requests.

BotID, canonical signed sessions, bounded request bodies, and Redis-backed per-session and aggregate IP limits protect public actions. Production fails closed when shared protection storage is unavailable.

Meeting scheduling uses Redis locks derived from bounded external request budgets, a stable browser idempotency key, deterministic Calendar IDs, and private request and operation digests. Existing links are replayed only for the original operation, while cancelled events are restored as fresh bookings.

Production builds validate critical variables, secret strength, URLs, and optional configuration groups before compilation. Local development uses an exact lockfile and a Docker Compose Redis service through the same application adapter.

The responsive layout supports desktop and narrow mobile screens, visible keyboard focus, safe-area insets, and system light and dark color schemes.
