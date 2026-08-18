# Project

## Purpose

`portfolio` is Henrique Krause's personal software engineering portfolio. It
presents identity, contact links, and selected projects in a compact interface
inspired by a terminal and the companion Shell project. Focused tools let
visitors compare a role with the published experience and schedule a
conversation.

## Scope

The site includes:

- Henrique's name, role, location, and email address;
- links to GitHub, LinkedIn, and X;
- a curated list of projects and static project case studies;
- a role-fit assessment grounded in the published portfolio content;
- one-hour meeting scheduling through Google Calendar;
- responsive light and dark presentation for desktop and mobile browsers.

The site does not provide an interactive terminal, authentication, persistent
application data, or a content management system.

## Core Concepts

- `src/content/portfolio.ts` is the canonical source for profile, social, project, and
  case-study content.
- Route files under `src/app` compose pages and HTTP endpoints. Shared components
  live under `src/components`; capability-specific code lives under
  `src/features`.
- Project cards link directly to internal case studies. Each case study links
  to its source repository as an external destination.

## Boundaries

- Keep the public handle in the heading as `cekrause`.
- Keep social accounts and GitHub repositories under `cekrauseee`.
- Keep portfolio content statically rendered and readable. Restrict client-side
  JavaScript to features that require browser state or interaction.
- Preserve the terminal-inspired visual language without imitating an
  interactive command prompt.
- Keep case-study claims factual. Do not add unverified metrics, business
  impact, team details, or personal responsibilities.
