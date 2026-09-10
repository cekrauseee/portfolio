#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { Client } from "pg";

const { loadEnvConfig } = nextEnv;
const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pageSize = 5;
const seedMessages = [
  {
    name: "Marta",
    message:
      "passei por aqui enquanto tomava um café. gostei muito do cuidado com os detalhes.",
  },
  {
    name: "Noah",
    message: "The portfolio feels calm and considered. Nice work.",
  },
  {
    name: "ゆき",
    message: "シンプルで、とても読みやすいポートフォリオですね。",
  },
  {
    name: "Amara",
    message: "I came for the projects and stayed to read the whole journal.",
  },
  {
    name: "Caio",
    message:
      "curti bastante a forma como os projetos contam o processo, não só o resultado.",
  },
  {
    name: "Sofia",
    message:
      "A small note from Lisbon. The guestbook fits the site beautifully.",
  },
  {
    name: "민준",
    message: "차분하고 세심하게 만든 포트폴리오라는 느낌이 들어요.",
  },
  {
    name: "Léa",
    message: "Très beau travail — simple, personnel et agréable à parcourir.",
  },
  {
    name: "Omar",
    message: "واضح وبسيط، وفيه اهتمام جميل بالتفاصيل.",
  },
  {
    name: "Ana",
    message:
      "essa mensagem é um pouco mais longa para conferir como o texto quebra em telas estreitas e como cada item mantém um ritmo confortável na lista.",
  },
  {
    name: "Theo",
    message:
      "Found this through GitHub. The writing makes the work easy to understand.",
  },
  {
    name: "Bia",
    message:
      "primeira linha para testar uma mensagem com quebra.\nsegunda linha, ainda no mesmo recado.",
  },
  {
    name: "Ren",
    message: "quiet, thoughtful, and very human. thanks for sharing your work.",
  },
];

if (process.argv.includes("--help")) {
  console.log(`Seed the local guestbook directly in Postgres.

Usage:
  npm run guestbook:seed

Loads DATABASE_URL from the local environment and inserts thirteen curated
messages, enough for three pages. The command only accepts a loopback Postgres
host and is safe to re-run: existing seed entries are skipped.`);
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error("Usage: npm run guestbook:seed");
  process.exit(1);
}

loadEnvConfig(projectDirectory, process.env.NODE_ENV !== "production");
if (process.env.NODE_ENV === "production") {
  console.error("Guestbook seeding is disabled in production.");
  process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Run npm run setup first.");
  process.exit(1);
}
let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  console.error("DATABASE_URL must be a valid Postgres URL.");
  process.exit(1);
}
if (
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(parsedDatabaseUrl.hostname)
) {
  console.error("Guestbook seeding only accepts a loopback Postgres database.");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
});
let inserted = 0;
try {
  await client.connect();
  await client.query("BEGIN");
  const now = Date.now();
  for (const [index, entry] of seedMessages.entries()) {
    const result = await client.query(
      `insert into public.guestbook_messages
        (name, message, created_at, submission_key)
       values ($1, $2, $3, $4)
       on conflict (submission_key) do nothing
       returning id`,
      [
        entry.name,
        entry.message,
        new Date(now - index * 45 * 60_000),
        `guestbook-development-seed:v1:${index + 1}`,
      ],
    );
    inserted += result.rowCount ?? 0;
  }
  await client.query("COMMIT");
} catch {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(
    "Unable to seed the guestbook. Check the local database and migrations.",
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}

if (process.exitCode !== 1) {
  console.log(
    `Guestbook seed complete: ${inserted} inserted, ${seedMessages.length - inserted} already present.`,
  );
  console.log(
    `${seedMessages.length} curated messages cover ${Math.ceil(seedMessages.length / pageSize)} pages of ${pageSize}.`,
  );
}
