import assert from "node:assert/strict";
import test from "node:test";

const { createLocalRedisAdapter } = await import("../src/lib/local-redis.ts");

test("local Redis adapter supports values, locks, and Lua scripts", async () => {
  const redis = createLocalRedisAdapter(process.env.REDIS_URL);
  const prefix = `portfolio:test:${crypto.randomUUID()}`;
  try {
    await redis.set(`${prefix}:object`, { ok: true }, { ex: 30 });
    assert.deepEqual(await redis.get(`${prefix}:object`), { ok: true });
    assert.equal(await redis.incr(`${prefix}:generation`), 1);
    assert.equal(await redis.incr(`${prefix}:generation`), 2);

    assert.equal(
      await redis.set(`${prefix}:lock`, "first", { ex: 30, nx: true }),
      "OK",
    );
    assert.equal(
      await redis.set(`${prefix}:lock`, "second", { ex: 30, nx: true }),
      null,
    );

    const released = await redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      [`${prefix}:lock`],
      ["first"],
    );
    assert.equal(Number(released), 1);
  } finally {
    await redis.eval(
      "return redis.call('del', KEYS[1], KEYS[2], KEYS[3])",
      [`${prefix}:object`, `${prefix}:lock`, `${prefix}:generation`],
      [],
    );
    await redis.close();
  }
});
