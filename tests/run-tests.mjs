#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
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

const testFiles = readdirSync(path.join(projectDirectory, "tests"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => path.join(projectDirectory, "tests", name));
const testDirectory = mkdtempSync(path.join(os.tmpdir(), "portfolio-tests-"));
const cacheDirectory = path.join(testDirectory, ".cache");
mkdirSync(cacheDirectory);
writeFileSync(
  path.join(cacheDirectory, "github-projects.json"),
  fixtureContents,
  "utf8",
);

let result;
try {
  result = spawnSync(
    process.execPath,
    ["--import", import.meta.resolve("tsx"), "--test", ...testFiles],
    {
      cwd: testDirectory,
      env: {
        ...process.env,
        GITHUB_OWNER: fixture.owner,
        TSX_TSCONFIG_PATH: path.join(projectDirectory, "tsconfig.json"),
      },
      stdio: "inherit",
    },
  );
} finally {
  rmSync(testDirectory, { recursive: true, force: true });
}

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
