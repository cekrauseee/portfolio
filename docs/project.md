# Project

## Purpose

`portfolio` is Henrique Krause's personal portfolio. It presents identity,
contact links, and selected projects in a compact interface inspired by a
terminal and the companion Shell project.

## Scope

The site includes:

- Henrique's name, role, location, and email address;
- links to GitHub, LinkedIn, and X;
- a curated list of projects and static project case studies;
- responsive light and dark presentation for desktop and mobile browsers.

The site does not provide an interactive terminal, authentication, a backend,
runtime data fetching, or a content management system.

## Core Concepts

- `src/content/portfolio.ts` is the canonical source for profile, social, project, and
  case-study content.
- Route files under `src/app` compose the page; components under `src/components` own
  reusable presentation and link behavior.
- Project cards link directly to internal case studies. Each case study links
  to its source repository as an external destination.

## Boundaries

- Keep the public handle in the heading as `cekrause`.
- Keep social accounts and GitHub repositories under `cekrauseee`.
- Keep the page static and readable without client-side JavaScript behavior.
- Preserve the terminal-inspired visual language without imitating an
  interactive command prompt.
- Keep case-study claims factual. Do not add unverified metrics, business
  impact, team details, or personal responsibilities.
