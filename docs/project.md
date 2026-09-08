# Project

## Purpose

`portfolio` is Henrique Krause's personal software engineering portfolio. It
presents identity, contact links, and selected projects in a compact interface
with a centered, single-column editorial direction. Focused tools let visitors
compare a role with the published experience and schedule a conversation.

## Scope

The site includes:

- a canonical public identity in `src/config/site.ts`;
- profile details and links to GitHub, LinkedIn, and X;
- a curated list of projects with inline expandable case studies;
- a role-fit assessment grounded in the published portfolio content;
- one-hour meeting scheduling through Google Calendar;
- an optional best-effort Resend notification to the owner;
- a moderated visitor guestbook displayed on an interactive globe;
- responsive light and dark presentation for desktop and mobile browsers.

The site does not provide an interactive terminal, authentication, visitor
accounts, or a content management system. Postgres persists approved guestbook
messages only.

## Core concepts

- `src/config/site.ts` is the canonical source for the public name and site metadata.
- `src/content/portfolio.ts` adds profile details, social links, and validated project records.
- Route files under `src/app` compose pages and HTTP endpoints. Shared components
  live under `src/components`; capability-specific code lives under `src/features`.
- Project entries expand inline on the home page, one at a time. Expanded
  Markdown content links to its source repository as an external destination.

## Boundaries

- Keep the public handle in the heading as `cekrause`.
- Keep social accounts and GitHub repositories under `cekrauseee`.
- Keep portfolio content statically rendered and readable. Restrict client-side
  JavaScript to features that require browser state or interaction.
- Preserve the centered editorial visual language: restrained type hierarchy,
  mostly lowercase copy, light section structure, and text-led project entries.
- Keep case-study claims factual. Do not add unverified metrics, business impact,
  team details, or personal responsibilities.
- Adopt `.portfolio/project.md` in source repositories only when its complete
  record is ready for publication; invalid or duplicate records fail the sync.
- GitHub reconciliation is public-only: private repositories never participate.
- Treat Google Calendar as the authoritative booking result; Resend remains an
  optional additional notification rather than a booking dependency.
