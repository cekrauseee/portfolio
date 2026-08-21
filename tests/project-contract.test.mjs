import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseGithubProjectsSnapshot } from "../src/content/github-projects.ts";
import { syncGithubProjects } from "../scripts/sync-github-projects.mjs";

function projectWithSlug(slug) {
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
          return Response.json({
            encoding: "base64",
            content: Buffer.from(JSON.stringify(projectWithSlug(123))).toString(
              "base64",
            ),
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
