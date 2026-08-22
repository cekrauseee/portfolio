import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(read("package.json"));
const ciWorkflow = read(".github/workflows/ci.yml");
const reconcileWorkflow = read(".github/workflows/reconcile-projects.yml");
const initialMigration = read("drizzle/20260822152514_init/migration.sql");
const drizzleConfig = read("drizzle.config.ts");
const developmentDocs = read("docs/development.md");
const architectureDocs = read("docs/architecture.md");

test("database scripts use committed migrations instead of schema push", () => {
  assert.equal(packageJson.scripts["db:generate"], "drizzle-kit generate");
  assert.equal(packageJson.scripts["db:migrate"], "drizzle-kit migrate");
  assert.equal(
    packageJson.scripts["db:check"],
    "node scripts/check-database.mjs migrations",
  );
  assert.equal(
    packageJson.scripts["db:verify"],
    "node scripts/check-database.mjs schema",
  );
  assert.equal(packageJson.scripts["db:push"], undefined);
  assert.match(drizzleConfig, /table: "__portfolio_migrations"/);
});

test("the initial migration enrolls exact legacy schemas without altering data", () => {
  assert.match(initialMigration, /CREATE TABLE IF NOT EXISTS "messages"/);
  assert.match(
    initialMigration,
    /CREATE INDEX IF NOT EXISTS "messages_created_at_idx"/,
  );
  assert.doesNotMatch(initialMigration, /ALTER TABLE "messages"/);
  assert.doesNotMatch(initialMigration, /DROP (?:TABLE|COLUMN|INDEX)/);
});

test("schema verification remains the gate for divergent legacy schemas", () => {
  assert.match(
    developmentDocs,
    /schema verification immediately after migration still rejects incompatible\s+tables, columns, or indexes[\s\S]*divergent existing\s+schema is not repaired automatically[\s\S]*requires an audited migration/,
  );
  assert.match(
    architectureDocs,
    /verify the live schema, and only then invoke the Vercel Deploy Hook/,
  );
});

test("every production deploy trigger migrates and verifies before the hook", () => {
  assertProductionDelivery(ciWorkflow, { useLastMigration: true });
  assertProductionDelivery(reconcileWorkflow, { mainOnly: true });
});

function assertProductionDelivery(
  workflow,
  { mainOnly = false, useLastMigration = false } = {},
) {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: production-delivery/);
  assert.match(
    workflow,
    /DATABASE_URL: \$\{\{ secrets\.DATABASE_URL_UNPOOLED \}\}/,
  );
  if (mainOnly) {
    assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
    assert.match(workflow, /uses: actions\/checkout@v4\s+with:\s+ref: main/);
  }

  const migrateIndex = useLastMigration
    ? workflow.lastIndexOf("npm run db:migrate")
    : workflow.indexOf("npm run db:migrate");
  const verifyIndex = useLastMigration
    ? workflow.lastIndexOf("npm run db:verify")
    : workflow.indexOf("npm run db:verify");
  const deployIndex = workflow.indexOf("curl --fail");

  assert.ok(migrateIndex >= 0, "workflow must apply migrations");
  assert.ok(
    verifyIndex > migrateIndex,
    "schema verification must follow migrate",
  );
  assert.ok(
    deployIndex > verifyIndex,
    "deploy hook must follow schema verification",
  );
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
