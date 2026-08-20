import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import {
  drizzle as pgDrizzle,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "node:process";
import { messages } from "@/features/visitor-globe/db/schema";

export type { Message, NewMessage } from "@/features/visitor-globe/db/schema";

export type VisitorMessage = {
  id: string;
  name: string;
  message: string;
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
  createdAt: string;
};

type Database = NodePgDatabase<{ messages: typeof messages }>;

const schema = { messages };

let instance: Database | undefined;
let pgPool: Pool | undefined;

type DatabaseEnvironment = Record<string, string | undefined>;

/**
 * Resolve the connection string for the database.
 *
 * Production connects to Neon via the `DATABASE_URL` environment variable.
 * Development defaults to the local Docker Postgres service when the variable
 * is absent, so the portfolio still starts without explicit configuration.
 */
function resolveDatabaseUrl(environment: DatabaseEnvironment = env) {
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }
  if (environment.NODE_ENV === "production") {
    return undefined;
  }
  return "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";
}

function isNeonUrl(url: string) {
  return url.includes("neon.tech") || url.includes("neon-database");
}

/**
 * Create or return the singleton database instance.
 *
 * Production uses the Neon HTTP transport (serverless-friendly, no WebSocket).
 * Development uses a standard `pg` Pool against the local Docker Postgres.
 */
function database(
  environment: DatabaseEnvironment = env,
): Database | undefined {
  const url = resolveDatabaseUrl(environment);
  if (!url) {
    return undefined;
  }

  if (instance) {
    return instance;
  }

  if (environment.NODE_ENV === "production" || isNeonUrl(url)) {
    const sql = neon(url) as NeonQueryFunction<false, false>;
    instance = neonDrizzle(sql, { schema }) as unknown as Database;
  } else {
    pgPool ??= new Pool({ connectionString: url });
    instance = pgDrizzle(pgPool, { schema });
  }

  return instance;
}

/** Replace the database instance for deterministic integration tests. */
export function setDatabaseForTests(override?: Database) {
  instance = override;
}

/** Close open connections during graceful shutdown. */
export async function closeDatabase() {
  if (pgPool) {
    await pgPool.end();
    pgPool = undefined;
  }
  instance = undefined;
}

/**
 * Fetch visitor messages for the globe, oldest first, bounded to keep the
 * payload small.
 */
export async function fetchMessages(limit = 200): Promise<VisitorMessage[]> {
  const db = database();
  if (!db) {
    return [];
  }
  const rows = await db
    .select()
    .from(messages)
    .orderBy(messages.createdAt)
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    message: row.message,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    country: row.country,
    city: row.city,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Persist a visitor message after it has passed moderation.
 */
export async function createMessage(input: {
  name: string;
  message: string;
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
}): Promise<string> {
  const db = database();
  if (!db) {
    throw new Error("Database is not available.");
  }
  const [row] = await db
    .insert(messages)
    .values({
      name: input.name,
      message: input.message,
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      country: input.country,
      city: input.city,
    })
    .returning({ id: messages.id });

  return row.id;
}
