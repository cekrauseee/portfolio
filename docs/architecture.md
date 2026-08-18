# Architecture

## Overview

The project is a static Next.js App Router application. `src/app` contains only
routes, framework metadata, and global styles; reusable UI, portfolio data, and
site configuration live alongside it under `src`. Project configuration and
public assets remain at the repository root. The home page and project case
studies are rendered from local TypeScript data with React Server Components.
The `/projects` route permanently redirects to the home page. Tailwind CSS
provides component styling, while `src/app/globals.css` contains only the
Tailwind import, global color tokens, and body defaults.

## Components

| Path                                 | Responsibility                                                      |
| ------------------------------------ | ------------------------------------------------------------------- |
| `src/app/layout.tsx`                 | Root metadata, viewport behavior, font loading, and document styles |
| `src/app/page.tsx`                   | Home-page composition and contact block                             |
| `src/app/not-found.tsx`              | Root 404 page                                                       |
| `src/app/projects/page.tsx`          | Permanent redirect from `/projects` to `/`                          |
| `src/app/projects/[slug]/page.tsx`   | Static project pages, metadata, and structured data                 |
| `src/app/globals.css`                | Tailwind entry point and global color tokens                        |
| `src/components/site-navigation.tsx` | Primary social navigation                                           |
| `src/components/project-list.tsx`    | Full-card internal project links                                    |
| `src/components/external-link.tsx`   | Shared external-link behavior and Tailwind states                   |
| `src/content/portfolio.ts`           | Canonical profile, social-link, project, and case-study data        |
| `src/config/site.ts`                 | Site-wide identity and canonical URL configuration                  |

## Data Flow

`src/content/portfolio.ts` exports static values. Server Components read those values
during rendering and produce `/` and `/projects/[slug]` routes.
`generateStaticParams` pre-renders every case study, while each route exports
unique canonical metadata. The sitemap derives case-study URLs from the same
content source. The production build emits static pages; the browser only
handles native links, responsive CSS, and color scheme selection.

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
text notification to the owner. There is intentionally no database,
idempotency, rate-limiting, or locking layer.

## Invariants

- The home page remains a Server Component and does not require hydration.
- Content changes belong in `src/content/portfolio.ts`, not duplicated across components.
- Internal navigation uses Next.js `Link`. External navigation uses native
  anchors with `target="_blank"` and `rel="noreferrer"`; email uses a native
  `mailto:` link.
- Cards remain fully clickable and keyboard focus remains visible.
- Mobile layout respects safe-area insets and avoids horizontal overflow.
- Component styling uses Tailwind utilities; global CSS stays limited to
  application-wide tokens and defaults.
