# Architecture

## Overview

The project is a single-route Next.js App Router application. The home page is
rendered statically from local TypeScript data and React Server Components.
Tailwind CSS provides component styling, while `app/globals.css` contains only
the Tailwind import, global color tokens, and body defaults.

## Components

| Path | Responsibility |
| --- | --- |
| `app/layout.tsx` | Root metadata, viewport behavior, font loading, and document styles |
| `app/page.tsx` | Home-page composition and contact block |
| `app/content.ts` | Canonical profile, social-link, and project data |
| `app/_components/site-navigation.tsx` | Primary social navigation |
| `app/_components/project-list.tsx` | Full-card project links |
| `app/_components/external-link.tsx` | Shared external-link behavior and Tailwind states |
| `app/globals.css` | Tailwind entry point and global color tokens |

## Data Flow

`app/content.ts` exports static values. Server Components read those values
during rendering and produce the `/` route. The production build emits a
static page; the browser only handles native links, responsive CSS, and color
scheme selection.

## Invariants

- The home page remains a Server Component and does not require hydration.
- Content changes belong in `app/content.ts`, not duplicated across components.
- External navigation uses Next.js `Link` with `target="_blank"` and
  `rel="noreferrer"`; email uses a native `mailto:` link.
- Cards remain fully clickable and keyboard focus remains visible.
- Mobile layout respects safe-area insets and avoids horizontal overflow.
- Component styling uses Tailwind utilities; global CSS stays limited to
  application-wide tokens and defaults.
