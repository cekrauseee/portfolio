import { site } from "@/config/site";
import { loadGithubProjects } from "./github-projects";
import { localizeProject, type Project } from "./project";
import type { Locale } from "@/i18n/config";

export type { LocalizedProject, Project } from "./project";

export const profile = {
  handle: "cekrause",
  name: site.name,
  role: "Software engineer",
  location: "Lisbon",
  email: "henrique@cekrause.eu",
} as const;

export const socialLinks = [
  { label: "github", href: "https://github.com/cekrauseee" },
  { label: "linkedin", href: "https://www.linkedin.com/in/cekrauseee" },
  { label: "x", href: "https://x.com/cekrauseee" },
] as const;

export const experience = [
  {
    id: "teamIt",
    company: "team.it",
    role: "software engineer",
    period: "february–july 2026",
    details: [
      "I worked on AI and agent experiments in R&D. The main one was a desktop assistant for managers interviewing consultants. I worked with the R&D director on the requirements and built the application, from the architecture through to its release on the Microsoft Store.",
      "It could suggest questions during a meeting and help work with transcripts and files afterward. A small group of consultants was using it in meetings before I left.",
    ],
  },
  {
    id: "clinia",
    company: "clinia",
    role: "full-stack intern → software engineer",
    period: "november 2023–november 2025",
    details: [
      "I joined as the fourth person on the engineering team, starting with a year as an intern. We built software to help clinics manage patient conversations and automate everyday tasks.",
      "I worked on product features and visual workflows, and built the initial module for the platform's first AI agent. As the product grew, I also worked on support, stability, and changes to the backend and AI architecture.",
    ],
  },
  {
    id: "killing",
    company: "killing",
    role: "it intern",
    period: "september 2022–april 2023",
    details: [
      "I worked in IT support at a paint manufacturer and built a couple of applications alongside that work. One helped sales consultants fill in customer visit checklists and went into production. The other was a prototype for monitoring factory equipment.",
    ],
  },
] as const;

export const projects: readonly Project[] = loadGithubProjects();

export function getProject(slug: string, locale: Locale = "en") {
  const project = projects.find((candidate) => candidate.slug === slug);
  return project ? localizeProject(project, locale) : undefined;
}

export function getProjects(locale: Locale) {
  return projects.map((project) => localizeProject(project, locale));
}
