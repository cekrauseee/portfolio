# Project

## Purpose

`cekrause` is Henrique Krause's personal portfolio. It presents identity,
contact links, and selected projects in a compact interface inspired by a
terminal and the companion Shell project.

## Scope

The site includes:

- Henrique's name, role, location, and email address;
- links to GitHub, LinkedIn, and X;
- a curated list of projects that link to their GitHub repositories;
- responsive light and dark presentation for desktop and mobile browsers.

The site does not provide an interactive terminal, authentication, a backend,
runtime data fetching, or a content management system.

## Core Concepts

- `app/content.ts` is the canonical source for profile, social, and project
  content.
- Route files compose the page; components under `app/_components` own
  reusable presentation and link behavior.
- Project and social destinations are external links and open in a new tab.

## Boundaries

- Keep the public handle in the heading as `cekrause`.
- Keep social accounts and GitHub repositories under `cekrauseee`.
- Keep the page static and readable without client-side JavaScript behavior.
- Preserve the terminal-inspired visual language without imitating an
  interactive command prompt.
