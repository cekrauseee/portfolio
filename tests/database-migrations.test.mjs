import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(read("package.json"));
const drizzleConfig = read("drizzle.config.ts");
const schema = read("src/db/schema.ts");

test("the generic Drizzle setup remains available", () => {
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
  assert.equal(packageJson.scripts["db:seed"], undefined);
  assert.equal(packageJson.scripts["db:unseed"], undefined);
  assert.match(drizzleConfig, /schema: "\.\/src\/db\/schema\.ts"/);
  assert.match(drizzleConfig, /table: "__portfolio_migrations"/);
});

test("guestbook has a migration chain and production delivery gates", () => {
  assert.match(schema, /guestbook_messages/);
  assert.doesNotMatch(schema, /latitude|longitude/);
  const migrations = readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((name) => !name.startsWith("."))
    .sort();
  assert.equal(migrations[0], "20260822152514_init");
  assert.equal(migrations.length, 2);
  const replacement = read(`drizzle/${migrations[1]}/migration.sql`);
  assert.match(replacement, /DROP TABLE public\.messages/);
  assert.doesNotMatch(replacement, /DROP SCHEMA|DROP TABLE[^;]*CASCADE/);
  for (const workflow of [
    ".github/workflows/ci.yml",
    ".github/workflows/reconcile-projects.yml",
  ]) {
    const source = read(workflow);
    assert.ok(
      source.indexOf("npm run db:migrate") <
        source.indexOf("name: Trigger Vercel deploy hook"),
    );
    assert.ok(
      source.indexOf("npm run db:verify") <
        source.indexOf("name: Trigger Vercel deploy hook"),
    );
  }
});

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
