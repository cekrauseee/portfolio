# Development

## Prerequisites

- Node.js 20.9 or newer
- npm

## Setup

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create the production build |
| `npm run start` | Serve a completed production build |
| `npm run lint` | Run ESLint with the Next.js and TypeScript rules |

## Testing

There is no automated test suite. Before publishing a change, run:

```bash
npm run lint
npm run build
```

For layout changes, also inspect the page at desktop width and at mobile widths
down to 320 CSS pixels. Confirm that links remain keyboard accessible, project
cards retain their full hit area, and the page has no horizontal overflow.

## Conventions

- Keep components as React Server Components unless browser state or event
  handling requires a client boundary.
- Use Tailwind utilities for component styling. Keep `app/globals.css` limited
  to Tailwind setup and truly global tokens or defaults.
- Update portfolio content in `app/content.ts`.
- Use Next.js `Link` for navigation and preserve visible focus states.
- Write English Conventional Commit messages.
