#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { advanceMessageCacheGeneration } from "../src/features/guestbook/server/message-cache.ts";
import { messages } from "../src/features/guestbook/server/db/schema.ts";
import { redis } from "../src/lib/redis.ts";
import { seedMessages } from "./guestbook-seed-data.mjs";

const { loadEnvConfig } = nextEnv;
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(projectDir, process.env.NODE_ENV !== "production");

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";

if (process.argv.includes("--help")) {
  console.log(`Seed the guestbook with demo messages. The messages are presented on the visitor globe.

Usage:
  npm run db:seed

Connects to DATABASE_URL (or the local Docker Postgres default) and inserts
a curated set of visitor messages spread across the globe. Safe to re-run:
existing messages are not removed, but the seed set is idempotent by name
+ message to avoid duplicates. After the transaction commits, the command
advances the Redis message cache generation. If Redis is configured but
invalidation fails, the command exits with an error.`);
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();
const db = drizzle({ client });
let inserted = 0;

try {
  await client.query("BEGIN");
  try {
    for (const msg of seedMessages) {
      // Check idempotency by name + message to avoid duplicates on re-run.
      const dupCheck = await client.query(
        "SELECT id FROM messages WHERE name = $1 AND message = $2 LIMIT 1",
        [msg.name, msg.message],
      );

      if (dupCheck.rows.length > 0) {
        continue;
      }

      await db.insert(messages).values({
        name: msg.name,
        message: msg.message,
        latitude: String(msg.latitude),
        longitude: String(msg.longitude),
        country: msg.country,
        city: msg.city,
      });
      inserted++;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
} finally {
  client.release();
  await pool.end();
}

const cache = redis();
if (cache) {
  try {
    const invalidated = await advanceMessageCacheGeneration(cache);
    if (!invalidated) {
      throw new Error(
        "Guestbook messages were seeded, but Redis cache invalidation failed.",
      );
    }
  } finally {
    if (typeof cache.close === "function") {
      await cache.close();
    }
  }
  console.log("Guestbook message cache invalidated.");
} else {
  console.log("No Redis guestbook cache is configured.");
}

console.log(
  `\nSeed complete: ${inserted} message(s) inserted, ${seedMessages.length - inserted} already present.`,
);
console.log("Run npm run dev and open http://localhost:3000/guestbook.");
