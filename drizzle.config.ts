import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";

export default defineConfig({
  schema: "./src/features/visitor-globe/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
