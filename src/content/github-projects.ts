import { readFileSync } from "node:fs";
import path from "node:path";
import type { Project } from "./project";

export const githubProjectsSnapshotPath = path.join(
  process.cwd(),
  ".cache",
  "github-projects.json",
);

const projectKeys = [
  "description",
  "highlights",
  "metaDescription",
  "name",
  "repositoryUrl",
  "sections",
  "slug",
  "summary",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (!nonEmptyString(value)) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isSafeRepositoryUrl(value: unknown): value is string {
  if (!nonEmptyString(value)) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseProject(value: unknown, index: number): Project {
  if (!isRecord(value) || !hasExactKeys(value, projectKeys)) {
    throw new Error(`Invalid GitHub project at index ${index}.`);
  }

  if (
    typeof value.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !nonEmptyString(value.name) ||
    !nonEmptyString(value.description) ||
    !isSafeRepositoryUrl(value.repositoryUrl) ||
    !nonEmptyString(value.metaDescription) ||
    !nonEmptyString(value.summary) ||
    !Array.isArray(value.highlights) ||
    value.highlights.length === 0 ||
    !value.highlights.every(nonEmptyString) ||
    !Array.isArray(value.sections) ||
    value.sections.length === 0
  ) {
    throw new Error(`Invalid GitHub project at index ${index}.`);
  }

  const sections = value.sections.map((section, sectionIndex) => {
    if (
      !isRecord(section) ||
      !hasExactKeys(section, ["paragraphs", "title"]) ||
      !nonEmptyString(section.title) ||
      !Array.isArray(section.paragraphs) ||
      section.paragraphs.length === 0 ||
      !section.paragraphs.every(nonEmptyString)
    ) {
      throw new Error(
        `Invalid GitHub project section at index ${index}.${sectionIndex}.`,
      );
    }

    return {
      title: section.title,
      paragraphs: section.paragraphs,
    };
  });

  return {
    slug: value.slug,
    name: value.name,
    description: value.description,
    repositoryUrl: value.repositoryUrl,
    metaDescription: value.metaDescription,
    summary: value.summary,
    highlights: value.highlights,
    sections,
  };
}

export function parseGithubProjectsSnapshot(
  value: unknown,
): readonly Project[] {
  const githubOwner = process.env.GITHUB_OWNER?.trim();
  if (!githubOwner) {
    throw new Error("GITHUB_OWNER is required to validate project data.");
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["generatedAt", "owner", "projects", "version"]) ||
    value.version !== 1 ||
    !isIsoTimestamp(value.generatedAt) ||
    !nonEmptyString(value.owner) ||
    value.owner !== githubOwner ||
    !Array.isArray(value.projects)
  ) {
    throw new Error("Invalid GitHub projects snapshot.");
  }

  const projects = value.projects.map(parseProject);
  const slugs = new Set<string>();
  for (const project of projects) {
    if (slugs.has(project.slug)) {
      throw new Error(`Duplicate project slug in snapshot: ${project.slug}.`);
    }
    slugs.add(project.slug);
  }

  return projects;
}

export function loadGithubProjects(): readonly Project[] {
  let contents: string;

  try {
    contents = readFileSync(githubProjectsSnapshotPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `A valid GitHub project snapshot is required at ${githubProjectsSnapshotPath}. ${message}`,
    );
  }

  let snapshot: unknown;
  try {
    snapshot = JSON.parse(contents);
  } catch {
    throw new Error(
      `The GitHub project snapshot must contain valid JSON at ${githubProjectsSnapshotPath}.`,
    );
  }

  return parseGithubProjectsSnapshot(snapshot);
}
