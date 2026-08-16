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
    description: "An offline-first PWA for counting airplanes together.",
    repositoryUrl: "https://github.com/cekrauseee/avioes",
  },
  {
    slug: "shell",
    name: "cekrauseee/shell",
    description: "A conversational interface built around the terminal.",
    repositoryUrl: "https://github.com/cekrauseee/shell",
  },
  {
    slug: "harness",
    name: "cekrauseee/harness",
    description: "Continuity and orchestration for coding agents.",
    repositoryUrl: "https://github.com/cekrauseee/harness",
  },
  {
    slug: "portfolio",
    name: "cekrauseee/portfolio",
    description: "This personal website.",
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
      "Aviões is an offline-first PWA for groups to count airplanes, keep a shared tally, and review sighting streaks.",
    summary:
      "Aviões is a small group-based PWA for turning airplane sightings into a shared record. People can count together, keep a diary of streaks, and compare the group scoreboard.",
    highlights: [
      "Offline-first",
      "Shared groups",
      "PWA",
      "Next.js",
      "Postgres",
      "IndexedDB",
    ],
    sections: [
      {
        title: "What it does",
        paragraphs: [
          "Aviões gives a group one shared place to register airplane sightings. Each sighting adds to a tally, while consecutive sightings by the same person are kept together as a streak.",
          "The product also includes group totals, individual leaders, and a global ranking so the activity remains easy to revisit over time.",
        ],
      },
      {
        title: "How it is built",
        paragraphs: [
          "The app is an installable PWA built in a Turborepo with Next.js, React, TypeScript, and Postgres. The repository also includes a separate backoffice application for group and user management.",
          "Offline work is part of the product model. An IndexedDB snapshot and pending-operation queue keep a local record, while a service worker manages a build-versioned cache.",
        ],
      },
      {
        title: "Product choices",
        paragraphs: [
          "The main interaction is deliberately small: tap once for a sighting. The rest of the interface supports that action with shared group context instead of turning it into a complex form.",
          "Brazilian Portuguese is the default language, with English available alongside it. Light and dark themes and selectable color palettes let people keep the app comfortable in different settings.",
        ],
      },
    ],
  },
  {
    ...projects[1],
    metaDescription:
      "Shell is a conversational interface that uses the terminal as its primary interaction model.",
    summary:
      "Shell explores a conversational interface through the language and constraints of the terminal. It treats commands, prompts, and replies as a focused way to move through a conversation.",
    highlights: [
      "Conversational UI",
      "Terminal interaction",
      "Focused interaction",
    ],
    sections: [
      {
        title: "Intent",
        paragraphs: [
          "The project asks how a terminal can be used as a conversation surface without making the experience feel like a command-line imitation.",
          "Its interface keeps the directness of a prompt while making room for readable responses and a calmer pace than a traditional terminal window.",
        ],
      },
      {
        title: "Interface",
        paragraphs: [
          "Shell is built around a single interaction model instead of a collection of panels. This makes the conversation itself the primary structure of the product.",
          "The visual language informed this portfolio: compact navigation, restrained hierarchy, and content that reads like a document rather than a dashboard.",
        ],
      },
    ],
  },
  {
    ...projects[2],
    metaDescription:
      "Harness is a file-native continuity and orchestration layer for coding agents and skill-compatible hosts.",
    summary:
      "Harness is a lean, file-native layer for helping coding agents keep useful project context, write concise handoffs, and coordinate bounded work across compatible hosts.",
    highlights: [
      "Agent continuity",
      "Project handoffs",
      "Multi-agent work",
      "Python",
      "Git",
    ],
    sections: [
      {
        title: "Problem",
        paragraphs: [
          "Long-running work with coding agents needs continuity, but loading every previous conversation is noisy and expensive. Harness keeps durable project context locally and makes it discoverable when it is relevant.",
          "The project is designed to work with Codex, Claude Code, and other hosts that support the same skill model without requiring a specific application framework.",
        ],
      },
      {
        title: "Approach",
        paragraphs: [
          "Context is recovered in two stages. Agents first search a compact semantic catalog, then load only the selected record under a defined budget.",
          "The same system supports concise session handoffs and bounded multi-agent orchestration. Git conventions, documentation, and project artifacts remain available when they are useful, rather than becoming requirements for every project.",
        ],
      },
      {
        title: "Boundaries",
        paragraphs: [
          "Harness keeps its state outside the repository. It does not add project identity files or automatically inject memory into every conversation.",
          "This keeps the layer optional and lets a project remain useful with its existing tools and conventions.",
        ],
      },
    ],
  },
  {
    ...projects[3],
    metaDescription:
      "A static, terminal-inspired software engineering portfolio built with Next.js and Tailwind CSS.",
    summary:
      "This portfolio is a static personal site for presenting selected work, contact details, and the reasoning behind each project in a compact, readable format.",
    highlights: [
      "Content-first",
      "Static site",
      "SEO",
      "Next.js",
      "Tailwind CSS",
    ],
    sections: [
      {
        title: "Purpose",
        paragraphs: [
          "The site presents a short professional profile and a focused set of projects. Each project page adds enough context to explain the work without turning the portfolio into a full product manual.",
          "The interface takes visual cues from Shell but is intentionally a document, not an interactive terminal.",
        ],
      },
      {
        title: "SEO and sharing",
        paragraphs: [
          "Every project page is generated statically with its own title, description, canonical URL, structured data, and sitemap entry. This gives search engines a distinct, indexable page for each project.",
          "The site also provides Open Graph and X card metadata so shared links have a consistent title, description, and preview image.",
        ],
      },
      {
        title: "Implementation",
        paragraphs: [
          "Content lives in local TypeScript data and routes are rendered as React Server Components. The production build outputs static pages without a CMS or client-side data layer.",
          "Tailwind CSS keeps the presentation responsive across desktop and mobile while preserving light and dark color schemes.",
        ],
      },
    ],
  },
];

export function getProject(slug: string) {
  return projectDetails.find((project) => project.slug === slug);
}
