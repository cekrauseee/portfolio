#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const fixturePath = path.join(
  projectDirectory,
  "fixtures",
  "github-projects.json",
);
const fixtureContents = readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureContents);

if (
  !fixture ||
  typeof fixture !== "object" ||
  typeof fixture.owner !== "string" ||
  !fixture.owner.trim()
) {
  throw new Error("The GitHub project fixture must declare a valid owner.");
}

const cacheDirectory = path.join(projectDirectory, ".cache");
mkdirSync(cacheDirectory, { recursive: true });
writeFileSync(
  path.join(cacheDirectory, "github-projects.json"),
  fixtureContents,
  "utf8",
);

const testFiles = readdirSync(path.join(projectDirectory, "scripts"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => path.join("scripts", name));
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...testFiles],
  {
    cwd: projectDirectory,
    env: {
      ...process.env,
      NODE_ENV: "test",
      GITHUB_OWNER: fixture.owner,
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
