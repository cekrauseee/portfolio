export const profile = {
  handle: "portfolio",
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
    name: "cekrauseee/avioes",
    description: "An offline-first PWA for counting airplanes together.",
    href: "https://github.com/cekrauseee/avioes",
  },
  {
    name: "cekrauseee/shell",
    description: "A conversational interface built around the terminal.",
    href: "https://github.com/cekrauseee/shell",
  },
  {
    name: "cekrauseee/harness",
    description: "Continuity and orchestration for coding agents.",
    href: "https://github.com/cekrauseee/harness",
  },
  {
    name: "cekrauseee/portfolio",
    description: "This personal website.",
    href: "https://github.com/cekrauseee/portfolio",
  },
] as const;
