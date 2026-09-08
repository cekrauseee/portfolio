import { readFileSync } from "node:fs";
import path from "node:path";
import type { Project } from "./project";

export const githubProjectsSnapshotPath = path.join(
  process.cwd(),
  ".cache",
  "github-projects.json",
);

const projectKeys = [
  "assetBaseUrl",
  "name",
  "repositoryUrl",
  "slug",
  "translations",
] as const;

const translationKeys = [
  "content",
  "description",
  "highlights",
  "metaDescription",
  "summary",
] as const;

const supportedLocales = ["en", "pt", "ja"] as const;

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

function isSafeAssetBaseUrl(value: unknown, owner: string): value is string {
  if (!nonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "raw.githubusercontent.com" &&
      url.port === "" &&
      url.search === "" &&
      url.hash === "" &&
      url.pathname.startsWith(`/${owner}/`) &&
      url.pathname.endsWith("/.portfolio/")
    );
  } catch {
    return false;
  }
}

function hasLevelOneHeading(content: string) {
  return /^ {0,3}#(?:[ \t]+|$)/m.test(content);
}

function parseTranslation(
  value: unknown,
  index: number,
  locale: string,
): Project["translations"]["en"] {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, translationKeys) ||
    !nonEmptyString(value.description) ||
    !nonEmptyString(value.metaDescription) ||
    !nonEmptyString(value.summary) ||
    !Array.isArray(value.highlights) ||
    value.highlights.length === 0 ||
    !value.highlights.every(nonEmptyString) ||
    !nonEmptyString(value.content) ||
    hasLevelOneHeading(value.content)
  ) {
    throw new Error(
      `Invalid GitHub project translation at index ${index}.${locale}.`,
    );
  }

  return {
    description: value.description,
    metaDescription: value.metaDescription,
    summary: value.summary,
    highlights: value.highlights,
    content: value.content,
  };
}

function parseProject(value: unknown, index: number, owner: string): Project {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, projectKeys) ||
    typeof value.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !nonEmptyString(value.name) ||
    !isSafeRepositoryUrl(value.repositoryUrl) ||
    !isSafeAssetBaseUrl(value.assetBaseUrl, owner) ||
    !isRecord(value.translations)
  ) {
    throw new Error(`Invalid GitHub project at index ${index}.`);
  }

  const translationsRecord = value.translations;
  const translationLocales = Object.keys(translationsRecord);
  if (
    !translationLocales.includes("en") ||
    translationLocales.some(
      (locale) =>
        !supportedLocales.includes(locale as (typeof supportedLocales)[number]),
    )
  ) {
    throw new Error(`Invalid GitHub project translations at index ${index}.`);
  }

  const translations = Object.fromEntries(
    translationLocales.map((locale) => [
      locale,
      parseTranslation(translationsRecord[locale], index, locale),
    ]),
  ) as Project["translations"];

  return {
    slug: value.slug,
    name: value.name,
    repositoryUrl: value.repositoryUrl,
    assetBaseUrl: value.assetBaseUrl,
    translations,
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
    value.version !== 2 ||
    !isIsoTimestamp(value.generatedAt) ||
    !nonEmptyString(value.owner) ||
    value.owner !== githubOwner ||
    !Array.isArray(value.projects)
  ) {
    throw new Error("Invalid GitHub projects snapshot.");
  }

  const projects = value.projects.map((project, index) =>
    parseProject(project, index, githubOwner),
  );
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
