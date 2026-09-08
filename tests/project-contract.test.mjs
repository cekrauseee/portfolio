import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseGithubProjectsSnapshot } from "../src/content/github-projects.ts";
import { syncGithubProjects } from "../scripts/sync-github-projects.mjs";
import { localizeProject } from "../src/content/project.ts";

function projectWithSlug(slug) {
  return {
    slug,
    name: "fixture-owner/numeric",
    repositoryUrl: "https://github.com/fixture-owner/numeric",
    assetBaseUrl:
      "https://raw.githubusercontent.com/fixture-owner/numeric/main/.portfolio/",
    translations: {
      en: {
        description: "Fixture project.",
        metaDescription: "Fixture project metadata.",
        summary: "Fixture project summary.",
        highlights: ["Fixtures"],
        content: "## Product\n\nFixture details.",
      },
    },
  };
}

function legacyProjectWithSlug(slug) {
  return {
    slug,
    name: "fixture-owner/numeric",
    description: "Fixture project.",
    repositoryUrl: "https://github.com/fixture-owner/numeric",
    metaDescription: "Fixture project metadata.",
    summary: "Fixture project summary.",
    highlights: ["Fixtures"],
    sections: [{ title: "Product", paragraphs: ["Fixture details."] }],
  };
}

test("localized projects select requested content and fall back to English", () => {
  const project = {
    slug: "localized",
    name: "fixture-owner/localized",
    repositoryUrl: "https://github.com/fixture-owner/localized",
    assetBaseUrl:
      "https://raw.githubusercontent.com/fixture-owner/localized/main/.portfolio/",
    translations: {
      en: {
        description: "English description.",
        metaDescription: "English metadata.",
        summary: "English summary.",
        highlights: ["Fixtures"],
        content: "## Product\n\nEnglish details.",
      },
      pt: {
        description: "Descrição em português.",
        metaDescription: "Metadados em português.",
        summary: "Resumo em português.",
        highlights: ["Fixtures"],
        content: "## Produto\n\nDetalhes em português.",
      },
    },
  };

  assert.equal(localizeProject(project, "pt").summary, "Resumo em português.");
  assert.equal(localizeProject(project, "pt").contentLocale, "pt");
  assert.equal(localizeProject(project, "ja").summary, "English summary.");
  assert.equal(localizeProject(project, "ja").contentLocale, "en");
});

test("project reader accepts localized content and rejects unsupported locales", () => {
  const previousOwner = process.env.GITHUB_OWNER;
  process.env.GITHUB_OWNER = "fixture-owner";
  const localized = {
    slug: "localized",
    name: "fixture-owner/localized",
    repositoryUrl: "https://github.com/fixture-owner/localized",
    assetBaseUrl:
      "https://raw.githubusercontent.com/fixture-owner/localized/main/.portfolio/",
    translations: {
      en: {
        description: "Description.",
        metaDescription: "Metadata.",
        summary: "Summary.",
        highlights: ["Fixtures"],
        content: "## Product\n\nDetails.",
      },
    },
  };

  try {
    const [parsed] = parseGithubProjectsSnapshot({
      version: 2,
      owner: "fixture-owner",
      generatedAt: "2026-08-19T00:00:00.000Z",
      projects: [localized],
    });
    assert.equal(parsed.translations.en.summary, "Summary.");

    assert.throws(
      () =>
        parseGithubProjectsSnapshot({
          version: 2,
          owner: "fixture-owner",
          generatedAt: "2026-08-19T00:00:00.000Z",
          projects: [
            {
              ...localized,
              translations: {
                ...localized.translations,
                fr: localized.translations.en,
              },
            },
          ],
        }),
      /Invalid GitHub project translations/,
    );
  } finally {
    if (previousOwner === undefined) {
      delete process.env.GITHUB_OWNER;
    } else {
      process.env.GITHUB_OWNER = previousOwner;
    }
  }
});

test("project writer and reader both reject non-string slugs", async () => {
  const previousOwner = process.env.GITHUB_OWNER;
  process.env.GITHUB_OWNER = "fixture-owner";
  const directory = await mkdtemp(path.join(os.tmpdir(), "project-contract-"));
  try {
    assert.throws(
      () =>
        parseGithubProjectsSnapshot({
          version: 1,
          owner: "fixture-owner",
          generatedAt: "2026-08-19T00:00:00.000Z",
          projects: [projectWithSlug(123)],
        }),
      /Invalid GitHub project/,
    );

    await assert.rejects(
      syncGithubProjects({
        owner: "fixture-owner",
        apiBase: "https://github.test",
        outputPath: path.join(directory, "snapshot.json"),
        fetchImpl: async (url) => {
          const parsed = new URL(url);
          if (parsed.pathname === "/users/fixture-owner/repos") {
            return Response.json([
              {
                id: 1,
                name: "numeric",
                full_name: "fixture-owner/numeric",
                default_branch: "main",
                private: false,
              },
            ]);
          }
          if (parsed.pathname.endsWith("/.portfolio/project.md")) {
            return new Response(null, { status: 404 });
          }
          return Response.json({
            encoding: "base64",
            content: Buffer.from(
              JSON.stringify(legacyProjectWithSlug(123)),
            ).toString("base64"),
          });
        },
      }),
      /invalid Project fields/,
    );
  } finally {
    if (previousOwner === undefined) {
      delete process.env.GITHUB_OWNER;
    } else {
      process.env.GITHUB_OWNER = previousOwner;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
