import { site } from "@/config/site";
import { loadGithubProjects } from "./github-projects";
import type { Project } from "./project";

export type { Project } from "./project";

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

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
