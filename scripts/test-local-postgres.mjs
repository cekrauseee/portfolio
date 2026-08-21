#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "scripts/local-postgres.integration.mjs"],
  {
    cwd: projectDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio",
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
