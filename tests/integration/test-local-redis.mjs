#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const projectDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
loadEnvConfig(projectDirectory, true, console, true);

const redisUrl = process.env.REDIS_URL?.trim();
if (!redisUrl) {
  console.error(
    "REDIS_URL is required. Run npm run setup or npm run services:up after configuring .env.local.",
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    "tests/integration/local-redis.integration.mjs",
  ],
  {
    cwd: projectDirectory,
    env: { ...process.env, REDIS_URL: redisUrl },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
