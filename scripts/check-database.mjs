#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const drizzleKitPath = resolve(
  projectDirectory,
  "node_modules/drizzle-kit/bin.cjs",
);
const mode = process.argv[2];

if (mode === "migrations") {
  requireStatus(runDrizzle(["check", "--output", "json"]), "ok");
  const result = runDrizzle(["generate", "--output", "json", "--explain"]);
  if (result.status !== "no_changes") {
    fail(
      "The Drizzle schema is not represented by the committed migrations. " +
        "Run `npm run db:generate -- --name=<migration-name>` and commit the generated files.",
    );
  }
  console.log("Database migrations are valid and match the Drizzle schema.");
} else if (mode === "schema") {
  const result = runDrizzle(["push", "--output", "json", "--explain"]);
  if (result.status !== "no_changes") {
    fail("The database schema does not match the committed Drizzle schema.");
  }
  console.log("Database schema matches the committed Drizzle schema.");
} else {
  fail("Usage: node scripts/check-database.mjs <migrations|schema>");
}

function runDrizzle(arguments_) {
  const result = spawnSync(process.execPath, [drizzleKitPath, ...arguments_], {
    cwd: projectDirectory,
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  let response;
  try {
    response = JSON.parse(result.stdout.trim());
  } catch {
    fail("Drizzle Kit returned an unreadable response.", result.stderr);
  }

  if (response.status === "error") {
    const code = response.error?.code;
    fail(`Drizzle Kit failed${code ? ` with ${code}` : ""}.`, result.stderr);
  }

  const expectedExitCode = response.status === "missing_hints" ? 2 : 0;
  if (result.status !== expectedExitCode) {
    fail(
      `Drizzle Kit returned status ${response.status} with unexpected exit code ${result.status}.`,
      result.stderr,
    );
  }

  return response;
}

function requireStatus(result, expected) {
  if (result.status !== expected) {
    fail(`Expected Drizzle Kit status ${expected}, received ${result.status}.`);
  }
}

function fail(message, details = "") {
  console.error(message);
  if (details.trim()) {
    console.error(details.trim());
  }
  process.exit(1);
}
