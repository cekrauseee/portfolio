#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(projectDir, ".env.local");
const localRedisUrl = "redis://127.0.0.1:6379";

if (process.argv.includes("--help")) {
  console.log(`Prepare local portfolio development.

Usage:
  npm run setup

Requires GITHUB_OWNER in .env.local or the exported environment, installs
dependencies, starts Docker Redis, writes missing local protection variables,
and verifies the Redis adapter.`);
  process.exit(0);
}

requireEnvValue("GITHUB_OWNER");
run("npm", ["install"]);
requireDocker();
ensureEnvValue("REDIS_URL", () => localRedisUrl);
ensureEnvValue("ANON_SESSION_SECRET", () =>
  randomBytes(48).toString("base64url"),
);
run("docker", ["compose", "up", "-d", "--wait", "redis"]);
run("npm", ["run", "test:redis"]);

console.log("\nDevelopment setup complete.");
console.log("Run npm run dev and open http://localhost:3000.");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectDir,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireDocker() {
  const result = spawnSync("docker", ["info"], {
    cwd: projectDir,
    stdio: "ignore",
  });
  if (result.status !== 0) {
    console.error("Docker is required and its daemon must be running.");
    process.exit(1);
  }
}

function readLocalEnv() {
  if (existsSync(envPath) && lstatSync(envPath).isSymbolicLink()) {
    throw new Error("Refusing to read or write .env.local through a symlink.");
  }
  return existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
}

function configuredValue(name, current = readLocalEnv()) {
  return process.env[name]?.trim() || parseEnv(current)[name]?.trim();
}

function requireEnvValue(name) {
  if (configuredValue(name)) {
    return;
  }
  console.error(
    `${name} is required. Copy .env.example to .env.local and set it before running setup.`,
  );
  process.exit(1);
}

function ensureEnvValue(name, createValue) {
  const current = readLocalEnv();
  if (configuredValue(name, current)) {
    return;
  }

  const line = `${name}=${JSON.stringify(createValue())}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${line}\n`;
  const temporaryPath = `${envPath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, envPath);
  chmodSync(envPath, 0o600);
}
