#!/usr/bin/env node
import nextEnv from "@next/env";
import { Client } from "pg";

const [action, id] = process.argv.slice(2);
if (
  !["hide", "restore"].includes(action) ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id ?? "",
  )
) {
  console.error(
    "Usage: npm run guestbook:moderate -- <hide|restore> <message-uuid>",
  );
  process.exit(1);
}
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "DATABASE_URL is required; select the intended database explicitly.",
  );
  process.exit(1);
}
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
try {
  await client.connect();
  const query = `update public.guestbook_messages set hidden_at = ${action === "hide" ? "now()" : "null"} where id = $1 returning id`;
  const result = await client.query(query, [id]);
  if (!result.rowCount) {
    console.error("Message not found.");
    process.exitCode = 1;
  } else console.log(`${action}: ${id}`);
} catch {
  console.error(
    "Guestbook moderation failed. Check the database connection and migrations.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
