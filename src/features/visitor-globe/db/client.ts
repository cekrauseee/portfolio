import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import {
  drizzle as pgDrizzle,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "node:process";
import {
  advanceMessageCacheGeneration,
  fetchCachedMessages,
} from "@/features/visitor-globe/message-cache";
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

async function fetchMessagesFromDatabase(): Promise<VisitorMessage[]> {
  const db = database();
  if (!db) {
    return [];
  }
  const rows = await db
    .select({
      id: messages.id,
      name: messages.name,
      message: messages.message,
      latitude: messages.latitude,
      longitude: messages.longitude,
      country: messages.country,
      city: messages.city,
    })
    .from(messages)
    .orderBy(messages.createdAt);

  return rows.map((row) => ({
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));
}

/** Fetch every visitor message, oldest first, through the shared Redis cache. */
export async function fetchMessages(): Promise<VisitorMessage[]> {
  return fetchCachedMessages(fetchMessagesFromDatabase);
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

  await advanceMessageCacheGeneration();
  return row.id;
}
