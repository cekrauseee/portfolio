import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";

export default defineConfig({
  schema: "./src/features/guestbook/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: { url: databaseUrl },
  migrations: {
    schema: "drizzle",
    table: "__portfolio_migrations",
  },
  verbose: true,
  strict: true,
});
