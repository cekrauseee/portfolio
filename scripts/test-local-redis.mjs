#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "scripts/local-redis.integration.mjs"],
  {
    cwd: projectDir,
    env: {
      ...process.env,
      NODE_ENV: "development",
      REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
      ANON_SESSION_SECRET:
        process.env.ANON_SESSION_SECRET || "local-integration-test-secret",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
