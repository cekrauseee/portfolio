# cekrause

A static, terminal-inspired personal portfolio built with Next.js and Tailwind CSS. The visual language follows the companion Shell project while presenting profile, project, and contact information as a readable document rather than an interactive command line.

## Development

Install dependencies and start the local server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Structure

- `app/_components` contains the portfolio's reusable UI.
- `app/content.ts` keeps profile, social, and project content together.
- `app/page.tsx` composes the home page.

Read the [developer documentation](docs/index.md) for project boundaries,
architecture, and contribution guidance.
