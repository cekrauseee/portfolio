import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(
  new URL("../scripts/seed-guestbook.mjs", import.meta.url),
);

test("seed script documents its direct local workflow", () => {
  const help = spawnSync(process.execPath, [script, "--help"], {
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /directly in Postgres/);
  assert.match(help.stdout, /npm run guestbook:seed/);
  assert.doesNotMatch(help.stdout, /API|development server/);
});

test("seed script rejects production and remote databases before connecting", () => {
  const localProduction = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:pass@127.0.0.1:5433/portfolio",
    },
  });
  assert.equal(localProduction.status, 1);
  assert.match(localProduction.stderr, /disabled in production/);

  const remoteDevelopment = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: "postgres://user:pass@example.com/portfolio",
    },
  });
  assert.equal(remoteDevelopment.status, 1);
  assert.match(remoteDevelopment.stderr, /only accepts a loopback Postgres/);
});
