# Architecture

## Overview

The project is a static Next.js App Router application. Application source lives
under `src/app`; project configuration and public assets remain at the
repository root. The home page and project case studies are rendered from local
TypeScript data with React Server Components. The `/projects` route permanently
redirects to the home page. Tailwind CSS provides component styling, while
`src/app/globals.css` contains only the Tailwind import, global color tokens,
and body defaults.

## Components

| Path                                      | Responsibility                                                      |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `src/app/layout.tsx`                      | Root metadata, viewport behavior, font loading, and document styles |
| `src/app/page.tsx`                        | Home-page composition and contact block                             |
| `src/app/not-found.tsx`                   | Root 404 page                                                       |
| `src/app/content.ts`                      | Canonical profile, social-link, project, and case-study data        |
| `src/app/projects/page.tsx`               | Permanent redirect from `/projects` to `/`                          |
| `src/app/projects/[slug]/page.tsx`        | Static project pages, metadata, and structured data                 |
| `src/app/_components/site-navigation.tsx` | Primary social navigation                                           |
| `src/app/_components/project-list.tsx`    | Full-card internal project links                                    |
| `src/app/_components/external-link.tsx`   | Shared external-link behavior and Tailwind states                   |
| `src/app/globals.css`                     | Tailwind entry point and global color tokens                        |

## Data Flow

`src/app/content.ts` exports static values. Server Components read those values
during rendering and produce `/` and `/projects/[slug]` routes.
`generateStaticParams` pre-renders every case study, while each route exports
unique canonical metadata. The sitemap derives case-study URLs from the same
content source. The production build emits static pages; the browser only
handles native links, responsive CSS, and color scheme selection.

## Invariants

- The home page remains a Server Component and does not require hydration.
- Content changes belong in `src/app/content.ts`, not duplicated across components.
- Internal navigation uses Next.js `Link`. External navigation uses native
  anchors with `target="_blank"` and `rel="noreferrer"`; email uses a native
  `mailto:` link.
- Cards remain fully clickable and keyboard focus remains visible.
- Mobile layout respects safe-area insets and avoids horizontal overflow.
- Component styling uses Tailwind utilities; global CSS stays limited to
  application-wide tokens and defaults.
