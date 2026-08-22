import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const seedScript = read("scripts/seed-guestbook.mjs");
const unseedScript = read("scripts/unseed-guestbook.mjs");

test("guestbook data scripts commit before advancing the shared cache generation", () => {
  for (const [name, script] of [
    ["seed", seedScript],
    ["unseed", unseedScript],
  ]) {
    assert.match(script, /const client = await pool\.connect\(\)/);
    assert.match(script, /await client\.query\("BEGIN"\)/);
    assert.match(script, /await client\.query\("ROLLBACK"\)/);
    assert.match(script, /client\.release\(\)/);

    const commit = script.indexOf('await client.query("COMMIT")');
    const invalidate = script.indexOf(
      "await advanceMessageCacheGeneration(cache)",
    );

    assert.ok(commit >= 0, `${name} must commit its database transaction`);
    assert.ok(
      invalidate > commit,
      `${name} must invalidate the cache after the database commit`,
    );
  }
});

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
