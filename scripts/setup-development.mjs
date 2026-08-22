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

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(projectDirectory, ".env.local");
const localRedisUrl = "redis://127.0.0.1:6379";
const localDatabaseUrl =
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";
const obsoleteLocalDatabaseUrl =
  "postgres://portfolio:portfolio@127.0.0.1:5432/portfolio";
const minimumNodeVersion = [22, 23, 2];
const minimumSessionSecretLength = 32;

if (process.argv.includes("--help")) {
  console.log(`Prepare local portfolio development.

Usage:
  npm run setup

Requires Node.js 22.23.2, Docker with Compose, and GITHUB_OWNER in .env.local.
Installs the exact lockfile, writes missing local service values, starts Redis
and Postgres, verifies Redis, applies database migrations, verifies the schema,
and seeds demo messages.`);
  process.exit(0);
}

requireSupportedNode();
requireLocalOwner();
run("npm", ["ci"]);
requireDocker();
ensureLocalEnvValue("REDIS_URL", () => localRedisUrl);
ensureLocalEnvValue("ANON_SESSION_SECRET", () =>
  randomBytes(48).toString("base64url"),
);
ensureLocalEnvValue("DATABASE_URL", () => localDatabaseUrl, [
  obsoleteLocalDatabaseUrl,
]);
validateLocalConfiguration();
chmodSync(envPath, 0o600);
run("npm", ["run", "services:up"]);
run("npm", ["run", "test:redis"]);
run("npm", ["run", "db:migrate"]);
run("npm", ["run", "db:verify"]);
run("npm", ["run", "db:seed"]);

console.log("\nDevelopment setup complete.");
console.log("Run npm run dev and open http://localhost:3000.");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectDirectory,
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

function requireSupportedNode() {
  const current = process.versions.node.split(".").map(Number);
  const supported =
    current[0] === minimumNodeVersion[0] &&
    compareVersions(current, minimumNodeVersion) >= 0;
  if (!supported) {
    console.error(
      `Node.js ${minimumNodeVersion.join(".")} or newer within the Node.js 22 release line is required. Current version: ${process.versions.node}.`,
    );
    process.exit(1);
  }
}

function compareVersions(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return 0;
}

function requireDocker() {
  const result = spawnSync("docker", ["info"], {
    cwd: projectDirectory,
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

function localEnvValue(name, current = readLocalEnv()) {
  return parseEnv(current)[name]?.trim();
}

function requireLocalOwner() {
  const owner = localEnvValue("GITHUB_OWNER");
  if (!owner) {
    console.error(
      "GITHUB_OWNER is required in .env.local. Copy .env.example to .env.local and set it before running setup.",
    );
    process.exit(1);
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(owner)) {
    console.error("GITHUB_OWNER contains unsupported characters.");
    process.exit(1);
  }
}

function ensureLocalEnvValue(name, createValue, replaceValues = []) {
  const current = readLocalEnv();
  const localValue = localEnvValue(name, current);
  if (localValue && !replaceValues.includes(localValue)) {
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
}

function validateLocalConfiguration() {
  const redisUrl = localEnvValue("REDIS_URL");
  try {
    const protocol = new URL(redisUrl).protocol;
    if (protocol !== "redis:" && protocol !== "rediss:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error("REDIS_URL in .env.local must be a valid redis:// URL.");
  }

  const secret = localEnvValue("ANON_SESSION_SECRET");
  if (!secret || secret.length < minimumSessionSecretLength) {
    throw new Error(
      `ANON_SESSION_SECRET in .env.local must contain at least ${minimumSessionSecretLength} characters.`,
    );
  }

  const databaseUrl = localEnvValue("DATABASE_URL");
  try {
    const protocol = new URL(databaseUrl).protocol;
    if (protocol !== "postgres:" && protocol !== "postgresql:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(
      "DATABASE_URL in .env.local must be a valid postgres:// URL.",
    );
  }
}
