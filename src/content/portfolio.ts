export const profile = {
  handle: "cekrause",
  name: "Henrique Krause",
  role: "Software engineer",
  location: "Lisbon",
  email: "henrique@cekrause.eu",
} as const;

export const socialLinks = [
  { label: "github", href: "https://github.com/cekrauseee" },
  { label: "linkedin", href: "https://www.linkedin.com/in/cekrauseee" },
  { label: "x", href: "https://x.com/cekrauseee" },
] as const;

export const projects = [
  {
    slug: "avioes",
    name: "cekrauseee/avioes",
    description: "An offline-first PWA for groups to count airplane sightings.",
    repositoryUrl: "https://github.com/cekrauseee/avioes",
  },
  {
    slug: "shell",
    name: "cekrauseee/shell",
    description: "A terminal-style AI chat built with the OpenAI Responses API.",
    repositoryUrl: "https://github.com/cekrauseee/shell",
  },
  {
    slug: "harness",
    name: "cekrauseee/harness",
    description: "A file-native continuity and orchestration layer for agents.",
    repositoryUrl: "https://github.com/cekrauseee/harness",
  },
  {
    slug: "portfolio",
    name: "cekrauseee/portfolio",
    description: "A static portfolio for selected software projects.",
    repositoryUrl: "https://github.com/cekrauseee/portfolio",
  },
] as const;

export type Project = (typeof projects)[number] & {
  readonly metaDescription: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly sections: readonly {
    readonly title: string;
    readonly paragraphs: readonly string[];
  }[];
};

export const projectDetails: readonly Project[] = [
  {
    ...projects[0],
    metaDescription:
      "Aviões is an offline-first PWA for groups to count airplane sightings, track streaks, and compare shared scoreboards.",
    summary:
      "Aviões is an offline-first PWA for groups of friends who count airplane sightings together. One tap records a sighting, updates the group tally, and keeps a shared diary and scoreboard.",
    highlights: [
      "Offline-first",
      "Multi-tenant groups",
      "Next.js",
      "Postgres",
      "IndexedDB",
      "PWA",
    ],
    sections: [
      {
        title: "Product",
        paragraphs: [
          "Members tap once when they see an airplane. The app records each sighting for the active group, combines consecutive sightings by the same person into streaks, and keeps totals, leaders, and recent activity easy to revisit.",
          "Groups are private and invite-only. Each person can join more than one group, switch between them, and review each shared history without mixing their data.",
        ],
      },
      {
        title: "What I built",
        paragraphs: [
          "I built the installable PWA and its backoffice as a Turborepo with Next.js, React, TypeScript, Postgres, and Drizzle. The backoffice provides a separate place to manage users and groups.",
          "The product supports email and password, one-time code, passkey, and Google sign-in. It ships in Brazilian Portuguese and English, with light and dark themes and six color palettes.",
        ],
      },
      {
        title: "Engineering choices",
        paragraphs: [
          "An IndexedDB snapshot and ordered operation queue keep counting available offline. Pending changes sync through Server Actions when the connection returns, while Postgres remains the source of truth.",
          "Every group read and write is checked against server-side membership. This keeps the one-tap interaction fast without moving authentication or tenancy decisions into the browser.",
        ],
      },
    ],
  },
  {
    ...projects[1],
    metaDescription:
      "Shell is a terminal-style AI chat interface built with Next.js and the OpenAI Responses API.",
    summary:
      "Shell is a terminal-style AI chat built around one focused conversation. It combines keyboard-first controls with readable Markdown responses and a minimal full-screen interface.",
    highlights: [
      "AI chat",
      "Terminal UI",
      "Next.js",
      "OpenAI API",
      "Markdown",
      "Accessibility",
    ],
    sections: [
      {
        title: "Product",
        paragraphs: [
          "Visitors write multiline prompts, move through earlier prompts with the arrow keys, and clear the conversation with a familiar keyboard shortcut. The assistant replies in the language of the latest message.",
          "The interface uses the directness of a terminal without pretending to be a command line. The conversation remains the only primary surface.",
        ],
      },
      {
        title: "What I built",
        paragraphs: [
          "I built the full-screen chat interface with a custom block cursor, prompt history, pending and error states, and accessible status announcements.",
          "Responses render safe GitHub Flavored Markdown and reveal word by word. The animation is disabled when the visitor prefers reduced motion.",
        ],
      },
      {
        title: "Engineering choices",
        paragraphs: [
          "A Next.js Server Action validates the conversation before calling the OpenAI Responses API. The API key stays on the server, and requests disable OpenAI response storage.",
          "Messages remain in browser memory and disappear after a reload or clear action. The project does not yet include accounts, persistent history, rate limits, or the controls required for a public production service.",
        ],
      },
    ],
  },
  {
    ...projects[2],
    metaDescription:
      "Harness is a file-native toolkit for agent continuity, project handoffs, and bounded multi-agent orchestration.",
    summary:
      "Harness is a file-native toolkit that helps agents recover relevant project context, maintain concise handoffs, and coordinate bounded work across compatible hosts.",
    highlights: [
      "Agent continuity",
      "Project handoffs",
      "Bounded orchestration",
      "File-native state",
      "Python",
      "Git",
    ],
    sections: [
      {
        title: "Product",
        paragraphs: [
          "Long-running agent work needs continuity, but loading every past conversation adds noise and cost. Harness keeps selected project context available without turning full transcripts into memory.",
          "It works with Git and non-Git projects through Codex, Claude Code, and other skill-compatible hosts. Projects do not need to adopt an application framework or store Harness files in their repositories.",
        ],
      },
      {
        title: "What I built",
        paragraphs: [
          "I built self-contained skills for project identity, selective recall, handoffs, worktrees, commits, pull requests, reviews, documentation, and artifacts.",
          "The same toolkit can coordinate a bounded, depth-one graph of agents with explicit dependencies, budgets, and write ownership.",
        ],
      },
      {
        title: "Engineering choices",
        paragraphs: [
          "Recall is pull-based. Agents search a compact catalog first, then load only the selected record under an explicit context budget.",
          "State stays under a machine-local Harness directory, outside target projects. The system stores concise, scoped records instead of raw chat transcripts and requires no database, daemon, or network service.",
        ],
      },
    ],
  },
  {
    ...projects[3],
    metaDescription:
      "Henrique Krause's static software engineering portfolio, built with Next.js and focused on readable project case studies.",
    summary:
      "This portfolio presents selected software projects in a compact, readable format. Each project has a factual case study, its own indexable page, and a direct link to the source code.",
    highlights: [
      "Static rendering",
      "Project case studies",
      "SEO",
      "Next.js",
      "Tailwind CSS",
    ],
    sections: [
      {
        title: "Product",
        paragraphs: [
          "The site keeps the professional profile, contact details, and selected work in one small interface. Project pages explain the product, the work completed, and the engineering decisions behind it.",
          "Its visual language comes from Shell, but the site behaves like a document instead of simulating a terminal.",
        ],
      },
      {
        title: "What I built",
        paragraphs: [
          "I built the site with the Next.js App Router, React Server Components, TypeScript, and Tailwind CSS. Portfolio content stays in one local data module instead of a CMS.",
          "Each case study is generated statically with its own metadata, canonical URL, structured data, and sitemap entry. Open Graph and X card metadata provide consistent link previews.",
        ],
      },
      {
        title: "Engineering choices",
        paragraphs: [
          "The production build outputs static pages without authentication, a backend, runtime data fetching, or a client-side data layer. This keeps the site fast and the content easy to maintain.",
          "The responsive layout supports desktop and narrow mobile screens, visible keyboard focus, safe-area insets, and system light and dark color schemes.",
        ],
      },
    ],
  },
];

export function getProject(slug: string) {
  return projectDetails.find((project) => project.slug === slug);
}
