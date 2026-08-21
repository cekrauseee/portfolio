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

export const projects: readonly Project[] = loadGithubProjects();

export function getProject(slug: string, locale: Locale = "en") {
  const project = projects.find((candidate) => candidate.slug === slug);
  return project ? localizeProject(project, locale) : undefined;
}

export function getProjects(locale: Locale) {
  return projects.map((project) => localizeProject(project, locale));
}
