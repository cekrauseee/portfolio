#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { Pool } from "pg";
import { advanceMessageCacheGeneration } from "../src/features/guestbook/server/message-cache.ts";
import { redis } from "../src/lib/redis.ts";
import { seedMessages } from "./guestbook-seed-data.mjs";

const { loadEnvConfig } = nextEnv;
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(projectDir, process.env.NODE_ENV !== "production");

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";

if (process.argv.includes("--help")) {
  console.log(`Remove the guestbook demo messages without touching visitor messages.

Usage:
  npm run db:unseed

Connects to DATABASE_URL (or the local Docker Postgres default), removes only
the exact records from the curated seed set, and advances the Redis message
cache generation. If Redis is configured but invalidation fails, the command
exits with an error so stale demo messages are not silently left visible.`);
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });
let removed = 0;

try {
  await pool.query("BEGIN");
  try {
    for (const msg of seedMessages) {
      const result = await pool.query(
        `DELETE FROM messages
         WHERE name = $1
           AND message = $2
           AND latitude = $3
           AND longitude = $4
           AND country = $5
           AND city = $6`,
        [
          msg.name,
          msg.message,
          String(msg.latitude),
          String(msg.longitude),
          msg.country,
          msg.city,
        ],
      );
      removed += result.rowCount ?? 0;
    }
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
} finally {
  await pool.end();
}

const cache = redis();
if (cache) {
  const invalidated = await advanceMessageCacheGeneration(cache);
  if (!invalidated) {
    if (typeof cache.close === "function") {
      await cache.close();
    }
    throw new Error(
      "Guestbook messages were removed, but Redis cache invalidation failed.",
    );
  }
  if (typeof cache.close === "function") {
    await cache.close();
  }
  console.log("Guestbook message cache invalidated.");
} else {
  console.log("No Redis guestbook cache is configured.");
}

console.log(`\nUnseed complete: ${removed} demo message(s) removed.`);
