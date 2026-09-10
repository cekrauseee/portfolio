import { neon } from "@neondatabase/serverless";
import {
  drizzle as neonDrizzle,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import {
  drizzle as pgDrizzle,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "node:process";

export type Database = NeonHttpDatabase | NodePgDatabase;

type DatabaseEnvironment = Record<string, string | undefined>;

let instance: Database | undefined;
let pgPool: Pool | undefined;

const localDatabaseUrl =
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";

export function resolveDatabaseUrl(
  environment: DatabaseEnvironment = env,
): string | undefined {
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }
  return environment.NODE_ENV === "production" ? undefined : localDatabaseUrl;
}

function isNeonUrl(url: string) {
  return url.includes("neon.tech") || url.includes("neon-database");
}

/** Return the shared Drizzle client when a database is configured. */
export function database(
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
    instance = neonDrizzle({ client: neon(url) });
  } else {
    pgPool ??= new Pool({ connectionString: url });
    instance = pgDrizzle({ client: pgPool });
  }

  return instance;
}

/** Close local pooled connections during graceful shutdown and tests. */
export async function closeDatabase() {
  if (pgPool) {
    await pgPool.end();
    pgPool = undefined;
  }
  instance = undefined;
}
