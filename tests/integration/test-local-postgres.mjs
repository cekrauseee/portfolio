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

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    "tests/integration/local-postgres.integration.mjs",
  ],
  {
    cwd: projectDirectory,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
