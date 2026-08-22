import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(read("package.json"));
const ciWorkflow = read(".github/workflows/ci.yml");
const reconcileWorkflow = read(".github/workflows/reconcile-projects.yml");
const initialMigration = read("drizzle/20260822152514_init/migration.sql");
const drizzleConfig = read("drizzle.config.ts");

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

test("the initial migration can enroll databases prepared by the old push flow", () => {
  assert.match(initialMigration, /CREATE TABLE IF NOT EXISTS "messages"/);
  assert.match(
    initialMigration,
    /CREATE INDEX IF NOT EXISTS "messages_created_at_idx"/,
  );
});

test("every production deploy trigger migrates and verifies before the hook", () => {
  assertProductionDelivery(ciWorkflow, { useLastMigration: true });
  assertProductionDelivery(reconcileWorkflow);
});

function assertProductionDelivery(workflow, { useLastMigration = false } = {}) {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: production-delivery/);
  assert.match(
    workflow,
    /DATABASE_URL: \$\{\{ secrets\.DATABASE_URL_UNPOOLED \}\}/,
  );

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
