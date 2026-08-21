import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/github-projects.json", import.meta.url),
    "utf8",
  ),
);
process.env.NODE_ENV = "test";
process.env.ANON_SESSION_SECRET = "test-only-secret";
process.env.GITHUB_OWNER ||= fixture.owner;
const protection = await import("../src/lib/abuse-protection.ts");
const { createInMemoryRedisAdapter } = await import("./in-memory-redis.mjs");
const resetInMemoryRedis = () =>
  protection.setRedisAdapterForTests(createInMemoryRedisAdapter());
resetInMemoryRedis();
const { createFitPost } = await import("../src/app/api/fit/route.ts");

function request(body, headers = {}) {
  return new Request("http://localhost/api/fit", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

function restoreEnvironment(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

test("readJson enforces content type, malformed JSON, and byte limits", async () => {
  assert.equal(
    (
      await protection.readJson(
        request("{}", { "content-type": "text/plain" }),
        "fit",
      )
    ).response.status,
    400,
  );
  assert.equal(
    (await protection.readJson(request("{", {}), "fit")).response.status,
    400,
  );
  assert.equal(
    (
      await protection.readJson(
        request("x".repeat(protection.BODY_LIMITS.meetings + 1)),
        "meetings",
      )
    ).response.status,
    413,
  );

  const largeDescription = "界".repeat(16_000);
  const largeParsed = await protection.readJson(
    request(JSON.stringify({ description: largeDescription })),
    "fit",
  );
  assert.equal(largeParsed.body.description, largeDescription);

  const encoder = new TextEncoder();
  const chunks = [
    encoder.encode('{"description":"'),
    encoder.encode("é".repeat(4)),
    encoder.encode('"}'),
  ];
  const streamed = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
  const parsed = await protection.readJson(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: streamed,
      duplex: "half",
    }),
    "fit",
  );
  assert.equal(parsed.body.description, "é".repeat(4));
});

test("Redis credentials only accept the Vercel Marketplace names", () => {
  assert.deepEqual(
    protection.resolveRedisCredentials({
      KV_REST_API_URL: " https://vercel-redis.test ",
      KV_REST_API_TOKEN: " vercel-token ",
    }),
    { url: "https://vercel-redis.test", token: "vercel-token" },
  );
  assert.equal(
    protection.resolveRedisCredentials({
      KV_REST_API_URL: "https://incomplete.test",
    }),
    undefined,
  );
  assert.equal(
    protection.resolveRedisCredentials({
      OTHER_REDIS_URL: "https://unsupported.test",
      OTHER_REDIS_TOKEN: "unsupported-token",
    }),
    undefined,
  );
});

test("local Redis is preferred outside production and ignored in production", () => {
  assert.deepEqual(
    protection.resolveRedisConfiguration({
      NODE_ENV: "development",
      REDIS_URL: " redis://127.0.0.1:6379 ",
      KV_REST_API_URL: "https://cloud.test",
      KV_REST_API_TOKEN: "cloud-token",
    }),
    { kind: "local", url: "redis://127.0.0.1:6379" },
  );
  assert.equal(
    protection.resolveRedisConfiguration({
      NODE_ENV: "production",
      REDIS_URL: "redis://127.0.0.1:6379",
    }),
    undefined,
  );
  assert.deepEqual(
    protection.resolveRedisConfiguration({
      NODE_ENV: "production",
      REDIS_URL: "redis://127.0.0.1:6379",
      KV_REST_API_URL: "https://cloud.test",
      KV_REST_API_TOKEN: "cloud-token",
    }),
    {
      kind: "upstash",
      url: "https://cloud.test",
      token: "cloud-token",
    },
  );
});

test("protection issues a canonical signed cookie and stable privacy-safe identity", async () => {
  const first = await protection.protect(
    "fit",
    request("{}", { "x-forwarded-for": "198.51.100.7" }),
  );
  assert.equal(first instanceof Response, false);
  const cookie = first.sessionCookie;
  assert.match(cookie, /^[\w-]+\.[0-9]+\.[\w-]+$/);

  const second = await protection.protect(
    "fit",
    request("{}", {
      cookie: `anon_session=${cookie}`,
      "x-forwarded-for": "198.51.100.7",
    }),
  );
  assert.equal(second.identity, first.identity);
  assert.equal(second.identity.includes("198.51.100.7"), false);

  const tampered = `${cookie.slice(0, -1)}x`;
  const rotated = await protection.protect(
    "fit",
    request("{}", {
      cookie: `anon_session=${tampered}`,
      "x-forwarded-for": "198.51.100.7",
    }),
  );
  assert.notEqual(rotated.sessionCookie, tampered);

  const suffixed = `${cookie}.unsigned-suffix`;
  const canonicalized = await protection.protect(
    "fit",
    request("{}", {
      cookie: `anon_session=${suffixed}`,
      "x-forwarded-for": "198.51.100.7",
    }),
  );
  assert.notEqual(canonicalized.identity, first.identity);
  assert.ok(canonicalized.sessionCookie);
  assert.notEqual(canonicalized.sessionCookie, suffixed);
});

test("rotating cookies cannot evade the higher independent IP bucket", async () => {
  let allowed;
  for (let i = 0; i < protection.LIMITS.fit.ip.window; i += 1) {
    allowed = await protection.protect(
      "fit",
      request("{}", {
        cookie: `anon_session=invalid-${i}`,
        "x-forwarded-for": "203.0.113.9",
      }),
    );
  }
  assert.equal(allowed instanceof Response, false);

  const blocked = await protection.protect(
    "fit",
    request("{}", {
      cookie: "anon_session=invalid-blocked",
      "x-forwarded-for": "203.0.113.9",
    }),
  );
  assert.equal(blocked.status, 429);
  assert.match(blocked.headers.get("retry-after"), /^\d+$/);
});

test("lock release cannot delete a newer owner", async () => {
  const key = `test-lock-${Date.now()}`;
  const first = await protection.acquire(key, 1);
  assert.ok(first);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const second = await protection.acquire(key, 10);
  assert.ok(second);
  await protection.release(key, first);
  assert.equal(await protection.acquire(key, 10), false);
  await protection.release(key, second);
});

test("production without Redis fails closed", async () => {
  const old = process.env.NODE_ENV;
  const oldKvUrl = process.env.KV_REST_API_URL;
  const oldKvToken = process.env.KV_REST_API_TOKEN;
  process.env.NODE_ENV = "production";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  protection.setRedisAdapterForTests();
  try {
    const result = await protection.protect(
      "fit",
      request("{}", { "x-vercel-forwarded-for": "192.0.2.1" }),
    );
    assert.equal(result.status, 503);
  } finally {
    process.env.NODE_ENV = old;
    restoreEnvironment("KV_REST_API_URL", oldKvUrl);
    restoreEnvironment("KV_REST_API_TOKEN", oldKvToken);
    resetInMemoryRedis();
  }
});

test("development without ANON_SESSION_SECRET fails closed", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSecret = process.env.ANON_SESSION_SECRET;
  process.env.NODE_ENV = "development";
  delete process.env.ANON_SESSION_SECRET;
  try {
    const result = await protection.protect(
      "fit",
      request("{}", { "x-forwarded-for": "198.51.100.21" }),
    );
    assert.equal(result.status, 503);
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    restoreEnvironment("ANON_SESSION_SECRET", oldSecret);
  }
});

test("production without ANON_SESSION_SECRET fails closed", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSecret = process.env.ANON_SESSION_SECRET;
  process.env.NODE_ENV = "production";
  delete process.env.ANON_SESSION_SECRET;
  try {
    const result = await protection.protect(
      "fit",
      request("{}", { "x-vercel-forwarded-for": "192.0.2.22" }),
    );
    assert.equal(result.status, 503);
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldSecret === undefined) {
      delete process.env.ANON_SESSION_SECRET;
    } else {
      process.env.ANON_SESSION_SECRET = oldSecret;
    }
  }
});

test("production Redis rate limits use one atomic eval and repair a missing TTL", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldUrl = process.env.KV_REST_API_URL;
  const oldToken = process.env.KV_REST_API_TOKEN;
  const counts = new Map();
  const ttls = new Map();
  const scripts = [];
  const fakeRedis = {
    async set() {
      return "OK";
    },
    async get() {
      return null;
    },
    async eval(script, keys, args) {
      scripts.push(script);
      const key = keys[0];
      const count = Number(counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      let ttl = Number(ttls.get(key) ?? -1);
      if (ttl < 0) {
        ttl = Number(args[0]);
        ttls.set(key, ttl);
      }
      return [count, ttl];
    },
  };
  // Keep BotId in its deterministic development bypass while exercising the
  // configured Redis branch (the production branch is covered below).
  process.env.NODE_ENV = "test";
  process.env.KV_REST_API_URL = "https://redis.test";
  process.env.KV_REST_API_TOKEN = "token";
  protection.setRedisAdapterForTests(fakeRedis);
  try {
    const result = await protection.protect(
      "fit",
      request("{}", { "x-vercel-forwarded-for": "192.0.2.10" }),
    );
    assert.equal(result instanceof Response, false);
    assert.equal(scripts.length, 4);
    assert.ok(scripts.every((script) => script.includes("INCR")));
    assert.ok(scripts.every((script) => script.includes("EXPIRE")));
    const firstKey = [...counts.keys()][0];
    ttls.delete(firstKey);
    await protection.protect(
      "fit",
      request("{}", {
        "x-vercel-forwarded-for": "192.0.2.10",
        cookie: `anon_session=${result.sessionCookie}`,
      }),
    );
    assert.ok(ttls.has(firstKey));
  } finally {
    protection.setRedisAdapterForTests();
    process.env.NODE_ENV = oldNodeEnv;
    restoreEnvironment("KV_REST_API_URL", oldUrl);
    restoreEnvironment("KV_REST_API_TOKEN", oldToken);
  }
});

test("production Redis errors fail closed with a session and never call upstream", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldUrl = process.env.KV_REST_API_URL;
  const oldToken = process.env.KV_REST_API_TOKEN;
  let upstreamCalls = 0;
  process.env.NODE_ENV = "production";
  process.env.KV_REST_API_URL = "https://redis.test";
  process.env.KV_REST_API_TOKEN = "token";
  protection.setRedisAdapterForTests({
    async set() {
      return "OK";
    },
    async get() {
      return null;
    },
    async eval() {
      throw new Error("redis down");
    },
  });
  try {
    const handler = createFitPost({
      protect: (operation, requestValue) =>
        protection.protect(operation, requestValue),
      assessRoleFit: async () => {
        upstreamCalls += 1;
        return "must not run";
      },
    });
    const result = await handler(
      request('{"description":"Build APIs"}', {
        "x-vercel-forwarded-for": "192.0.2.11",
      }),
    );
    assert.equal(result.status, 503);
    assert.match(result.headers.get("retry-after"), /^\d+$/);
    assert.match(result.headers.get("set-cookie") ?? "", /anon_session=/);
    assert.equal(upstreamCalls, 0);
  } finally {
    protection.setRedisAdapterForTests();
    process.env.NODE_ENV = oldNodeEnv;
    restoreEnvironment("KV_REST_API_URL", oldUrl);
    restoreEnvironment("KV_REST_API_TOKEN", oldToken);
  }
});
