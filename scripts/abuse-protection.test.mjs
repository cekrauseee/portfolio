import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.ANON_SESSION_SECRET = "test-only-secret";
const protection = await import("../src/lib/abuse-protection.ts");
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

test("Redis credentials support Vercel KV names and direct Upstash aliases", () => {
  assert.deepEqual(
    protection.resolveRedisCredentials({
      KV_REST_API_URL: " https://vercel-redis.test ",
      KV_REST_API_TOKEN: " vercel-token ",
    }),
    { url: "https://vercel-redis.test", token: "vercel-token" },
  );
  assert.deepEqual(
    protection.resolveRedisCredentials({
      UPSTASH_REDIS_REST_URL: "https://upstash.test",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    }),
    { url: "https://upstash.test", token: "upstash-token" },
  );
  assert.equal(
    protection.resolveRedisCredentials({
      KV_REST_API_URL: "https://incomplete.test",
      UPSTASH_REDIS_REST_TOKEN: "mismatched-token",
    }),
    undefined,
  );
});

test("protection issues a signed cookie and stable privacy-safe identity", async () => {
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
});

test("rotating cookies cannot evade the independent IP bucket", async () => {
  let result;
  for (let i = 0; i < 6; i++) {
    result = await protection.protect(
      "fit",
      request("{}", {
        cookie: `anon_session=invalid-${i}`,
        "x-forwarded-for": "203.0.113.9",
      }),
    );
  }
  assert.equal(result.status, 429);
  assert.match(result.headers.get("retry-after"), /^\d+$/);
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
  const oldUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NODE_ENV = "production";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
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
    restoreEnvironment("UPSTASH_REDIS_REST_URL", oldUpstashUrl);
    restoreEnvironment("UPSTASH_REDIS_REST_TOKEN", oldUpstashToken);
  }
});

test("development without ANON_SESSION_SECRET uses a stable local fallback", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSecret = process.env.ANON_SESSION_SECRET;
  process.env.NODE_ENV = "development";
  delete process.env.ANON_SESSION_SECRET;
  try {
    const first = await protection.protect(
      "fit",
      request("{}", { "x-forwarded-for": "198.51.100.21" }),
    );
    assert.equal(first instanceof Response, false);
    assert.ok(first.sessionCookie);
    const second = await protection.protect(
      "fit",
      request("{}", {
        cookie: `anon_session=${first.sessionCookie}`,
        "x-forwarded-for": "198.51.100.21",
      }),
    );
    assert.equal(second instanceof Response, false);
    assert.equal(second.identity, first.identity);
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldSecret === undefined) {
      delete process.env.ANON_SESSION_SECRET;
    } else {
      process.env.ANON_SESSION_SECRET = oldSecret;
    }
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
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
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
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
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
    if (oldUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = oldUrl;
    }
    if (oldToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
    }
  }
});

test("production Redis errors fail closed with a session and never call upstream", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let upstreamCalls = 0;
  process.env.NODE_ENV = "production";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
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
    if (oldUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = oldUrl;
    }
    if (oldToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
    }
  }
});
