import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import matter from "gray-matter";

const { loadEnvConfig } = nextEnv;

export const DEFAULT_GITHUB_API = "https://api.github.com";
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_OUTPUT_PATH = path.join(
  process.cwd(),
  ".cache",
  "github-projects.json",
);
export const PROJECT_FILE_PATH = ".portfolio/project.md";
const LOCALIZED_PROJECT_FILE_PATHS = {
  pt: ".portfolio/project.pt.md",
  ja: ".portfolio/project.ja.md",
};

const BASE_MARKDOWN_KEYS = [
  "description",
  "highlights",
  "metaDescription",
  "name",
  "repositoryUrl",
  "slug",
  "summary",
];
const TRANSLATED_MARKDOWN_KEYS = [
  "description",
  "highlights",
  "metaDescription",
  "summary",
];

/** Load environment files using the same precedence as Next.js. */
export function loadGithubProjectSyncEnv(
  projectDirectory = process.cwd(),
  mode = "development",
) {
  if (mode !== "development" && mode !== "production") {
    throw new Error(`Unsupported project sync mode: ${mode}.`);
  }
  loadEnvConfig(projectDirectory, mode === "development", console, true);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeRepositoryUrl(value) {
  if (!nonEmptyString(value)) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hasLevelOneHeading(content) {
  return /^ {0,3}#(?:[ \t]+|$)/m.test(content);
}

function validateMarkdownTranslation(data, content, context, expectedKeys) {
  if (
    !isRecord(data) ||
    !hasExactKeys(data, expectedKeys) ||
    !nonEmptyString(data.description) ||
    !nonEmptyString(data.metaDescription) ||
    !nonEmptyString(data.summary) ||
    !Array.isArray(data.highlights) ||
    data.highlights.length === 0 ||
    !data.highlights.every(nonEmptyString) ||
    !nonEmptyString(content) ||
    hasLevelOneHeading(content)
  ) {
    throw new Error(`${context} has invalid Markdown project fields.`);
  }

  return {
    description: data.description,
    metaDescription: data.metaDescription,
    summary: data.summary,
    highlights: data.highlights,
    content: content.trim(),
  };
}

function parseProjectMarkdown(source, context) {
  let parsed;
  try {
    parsed = matter(source);
  } catch (error) {
    throw new Error(`${context} has invalid front matter.`, { cause: error });
  }

  const translation = validateMarkdownTranslation(
    parsed.data,
    parsed.content,
    context,
    BASE_MARKDOWN_KEYS,
  );
  if (
    typeof parsed.data.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.data.slug) ||
    !nonEmptyString(parsed.data.name) ||
    !isSafeRepositoryUrl(parsed.data.repositoryUrl)
  ) {
    throw new Error(`${context} has invalid Markdown project identity.`);
  }

  return {
    slug: parsed.data.slug,
    name: parsed.data.name,
    repositoryUrl: parsed.data.repositoryUrl,
    translation,
  };
}

function parseProjectTranslationMarkdown(source, context) {
  let parsed;
  try {
    parsed = matter(source);
  } catch (error) {
    throw new Error(`${context} has invalid front matter.`, { cause: error });
  }

  return validateMarkdownTranslation(
    parsed.data,
    parsed.content,
    context,
    TRANSLATED_MARKDOWN_KEYS,
  );
}

function projectAssetBaseUrl(owner, repository, ref) {
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${encodeURIComponent(ref)}/.portfolio/`;
}

function apiHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cekrause-portfolio-project-sync",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `GitHub request timed out after ${timeoutMs}ms for ${url}.`,
        { cause: error },
      );
    }
    throw new Error(
      `GitHub request failed for ${url}: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
}

function responseDiagnostics(response, body) {
  const message =
    isRecord(body) && typeof body.message === "string" ? body.message : "";
  const requestId = response.headers?.get?.("x-github-request-id");
  const remaining = response.headers?.get?.("x-ratelimit-remaining");
  const reset = response.headers?.get?.("x-ratelimit-reset");
  const details = [
    message,
    requestId && `request ${requestId}`,
    remaining && `rate remaining ${remaining}`,
    reset && `rate reset ${reset}`,
  ].filter(Boolean);
  return details.length > 0 ? `: ${details.join(", ")}` : "";
}

async function getJson(fetchImpl, url, token, timeoutMs) {
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    { headers: apiHeaders(token) },
    timeoutMs,
  );
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      `GitHub request failed (${response.status}) for ${url}${responseDiagnostics(response, body)}`,
    );
  }

  return { body, response };
}

function nextPageFromLink(response, apiBaseUrl) {
  const link = response.headers?.get?.("link");
  if (!link) {
    return null;
  }

  const next = link
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.endsWith('rel="next"'));
  const match = next?.match(/^<([^>]+)>/);
  if (!match) {
    return null;
  }

  const nextUrl = new URL(match[1], apiBaseUrl);
  if (nextUrl.origin !== apiBaseUrl.origin) {
    throw new Error(
      `Refusing GitHub pagination link outside configured API origin: ${nextUrl.origin}.`,
    );
  }
  return nextUrl;
}

function decodeFileContent(body, context) {
  if (
    !isRecord(body) ||
    body.encoding !== "base64" ||
    typeof body.content !== "string"
  ) {
    throw new Error(`${context} did not return base64 file content.`);
  }

  return Buffer.from(body.content, "base64").toString("utf8");
}

async function getRepositoryFile({
  apiBase,
  fetchImpl,
  owner,
  path: filePath,
  ref,
  repository,
  timeoutMs,
  token,
}) {
  const url = new URL(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${filePath}`,
    apiBase,
  );
  url.searchParams.set("ref", ref);
  const response = await fetchWithTimeout(
    fetchImpl,
    url.toString(),
    { headers: apiHeaders(token) },
    timeoutMs,
  );

  if (response.status === 404) {
    return null;
  }

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(
      `GitHub project file request failed (${response.status}) for ${repository}${responseDiagnostics(response, body)}`,
    );
  }

  return { body, context: `${repository}/${filePath}` };
}

function repositoryIdentity(repo) {
  if (Number.isInteger(repo.id) && repo.id > 0) {
    return `id:${repo.id}`;
  }
  if (nonEmptyString(repo.full_name)) {
    return `name:${repo.full_name.toLowerCase()}`;
  }
  throw new Error(
    "GitHub repository response omitted immutable id and canonical full_name.",
  );
}

function validateRepository(repo) {
  if (!isRecord(repo)) {
    throw new Error("GitHub repository response contained invalid metadata.");
  }
  if (typeof repo.private !== "boolean") {
    throw new Error(
      `GitHub repository ${repo.name || "unknown"} omitted boolean private metadata.`,
    );
  }
  if (!nonEmptyString(repo.name) || !nonEmptyString(repo.default_branch)) {
    throw new Error(
      "GitHub repository response omitted name or default branch.",
    );
  }
  repositoryIdentity(repo);
  return repo;
}

export async function syncGithubProjects({
  fetchImpl = globalThis.fetch,
  owner = process.env.GITHUB_OWNER,
  token = process.env.GITHUB_TOKEN || "",
  apiBase = DEFAULT_GITHUB_API,
  outputPath = DEFAULT_OUTPUT_PATH,
  perPage = 100,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  maxPages = 10_000,
  now = new Date(),
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("This Node.js version does not provide fetch.");
  }
  if (!nonEmptyString(owner)) {
    throw new Error("GITHUB_OWNER is required when running project sync.");
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(owner)) {
    throw new Error(`Unsafe GitHub owner: ${owner}`);
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    throw new Error("perPage must be an integer between 1 and 100.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new Error("timeoutMs must be a positive number.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("maxPages must be a positive integer.");
  }

  const apiBaseUrl = new URL(apiBase);
  const repos = [];
  let page = 1;
  let nextUrl = null;
  let pagesFetched = 0;
  while (true) {
    pagesFetched += 1;
    if (pagesFetched > maxPages) {
      throw new Error(
        `GitHub repository pagination exceeded ${maxPages} pages.`,
      );
    }
    const url = nextUrl
      ? nextUrl
      : new URL(`/users/${encodeURIComponent(owner)}/repos`, apiBaseUrl);
    if (!nextUrl) {
      url.searchParams.set("type", "owner");
      url.searchParams.set("sort", "full_name");
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("page", String(page));
    }
    const { body, response } = await getJson(
      fetchImpl,
      url.toString(),
      token,
      timeoutMs,
    );

    if (!Array.isArray(body)) {
      throw new Error(
        `GitHub repository response for page ${page} was invalid.`,
      );
    }
    repos.push(...body);

    const next = nextPageFromLink(response, apiBaseUrl);
    if (next) {
      nextUrl = next;
      continue;
    }
    if (body.length < perPage) {
      break;
    }
    nextUrl = null;
    page += 1;
  }

  const projects = [];
  const repositoryIdentities = new Set();
  const slugs = new Set();

  for (const rawRepo of repos) {
    const repo = validateRepository(rawRepo);
    if (repo.private !== false) {
      continue;
    }
    const identity = repositoryIdentity(repo);
    if (repositoryIdentities.has(identity)) {
      continue;
    }
    repositoryIdentities.add(identity);

    const assetBaseUrl = projectAssetBaseUrl(
      owner,
      repo.name,
      repo.default_branch,
    );
    const markdownFile = await getRepositoryFile({
      apiBase,
      fetchImpl,
      owner,
      path: PROJECT_FILE_PATH,
      ref: repo.default_branch,
      repository: repo.name,
      timeoutMs,
      token,
    });

    if (markdownFile) {
      const baseProject = parseProjectMarkdown(
        decodeFileContent(markdownFile.body, markdownFile.context),
        markdownFile.context,
      );
      const translations = { en: baseProject.translation };

      for (const [locale, filePath] of Object.entries(
        LOCALIZED_PROJECT_FILE_PATHS,
      )) {
        const localizedFile = await getRepositoryFile({
          apiBase,
          fetchImpl,
          owner,
          path: filePath,
          ref: repo.default_branch,
          repository: repo.name,
          timeoutMs,
          token,
        });
        if (localizedFile) {
          translations[locale] = parseProjectTranslationMarkdown(
            decodeFileContent(localizedFile.body, localizedFile.context),
            localizedFile.context,
          );
        }
      }

      const project = {
        slug: baseProject.slug,
        name: baseProject.name,
        repositoryUrl: baseProject.repositoryUrl,
        assetBaseUrl,
        translations,
      };
      if (slugs.has(project.slug)) {
        throw new Error(`Duplicate project slug: ${project.slug}.`);
      }
      slugs.add(project.slug);
      projects.push(project);
    }
  }

  projects.sort(
    (left, right) =>
      left.slug.localeCompare(right.slug) ||
      left.repositoryUrl.localeCompare(right.repositoryUrl),
  );

  const snapshot = {
    version: 2,
    owner,
    generatedAt: now.toISOString(),
    projects,
  };
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${randomUUID()}`;

  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      temporaryPath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }

  return snapshot;
}

async function main() {
  const modeArgument = process.argv.find((argument) =>
    argument.startsWith("--mode="),
  );
  loadGithubProjectSyncEnv(
    process.cwd(),
    modeArgument ? modeArgument.slice("--mode=".length) : "development",
  );

  if (process.env.PROJECTS_SYNC_SKIP === "1") {
    if (!existsSync(DEFAULT_OUTPUT_PATH)) {
      throw new Error(
        `PROJECTS_SYNC_SKIP=1 requires an existing snapshot at ${DEFAULT_OUTPUT_PATH}.`,
      );
    }
    try {
      const snapshot = JSON.parse(readFileSync(DEFAULT_OUTPUT_PATH, "utf8"));
      if (
        snapshot?.version !== 2 ||
        typeof snapshot.generatedAt !== "string" ||
        typeof snapshot.owner !== "string" ||
        !Array.isArray(snapshot.projects)
      ) {
        throw new Error("invalid snapshot shape");
      }
    } catch (error) {
      throw new Error(
        `PROJECTS_SYNC_SKIP=1 requires a valid snapshot at ${DEFAULT_OUTPUT_PATH}.`,
        { cause: error },
      );
    }
    console.log(
      "Skipping GitHub project reconciliation because PROJECTS_SYNC_SKIP=1.",
    );
    return;
  }

  const snapshot = await syncGithubProjects();
  console.log(
    `Wrote ${snapshot.projects.length} GitHub project${snapshot.projects.length === 1 ? "" : "s"} to ${DEFAULT_OUTPUT_PATH}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
