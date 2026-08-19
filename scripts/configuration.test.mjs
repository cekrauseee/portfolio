import assert from "node:assert/strict";
import test from "node:test";
import { parseGithubProjectsSnapshot } from "../src/content/github-projects.ts";
import { syncGithubProjects } from "./sync-github-projects.mjs";

function restore(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

test("GitHub project configuration requires an explicit owner", async () => {
  const previous = process.env.GITHUB_OWNER;
  delete process.env.GITHUB_OWNER;
  try {
    await assert.rejects(
      syncGithubProjects({
        fetchImpl: async () => {
          throw new Error("must not fetch");
        },
      }),
      /GITHUB_OWNER is required/,
    );
    assert.throws(
      () =>
        parseGithubProjectsSnapshot({
          version: 1,
          owner: "test-owner",
          generatedAt: "2026-08-19T00:00:00.000Z",
          projects: [],
        }),
      /GITHUB_OWNER is required/,
    );
  } finally {
    restore("GITHUB_OWNER", previous);
  }
});

test("GitHub snapshots are bound to the configured owner", () => {
  const previous = process.env.GITHUB_OWNER;
  process.env.GITHUB_OWNER = "test-owner";
  try {
    assert.deepEqual(
      parseGithubProjectsSnapshot({
        version: 1,
        owner: "test-owner",
        generatedAt: "2026-08-19T00:00:00.000Z",
        projects: [],
      }),
      [],
    );
    assert.throws(
      () =>
        parseGithubProjectsSnapshot({
          version: 1,
          owner: "other-owner",
          generatedAt: "2026-08-19T00:00:00.000Z",
          projects: [],
        }),
      /Invalid GitHub projects snapshot/,
    );
  } finally {
    restore("GITHUB_OWNER", previous);
  }
});
