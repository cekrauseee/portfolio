import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryRedisAdapter } from "./in-memory-redis.mjs";

process.env.NODE_ENV = "test";

const {
  MESSAGE_CACHE_TTL_SECONDS,
  advanceMessageCacheGeneration,
  fetchCachedMessages,
} = await import("../src/features/visitor-globe/message-cache.ts");
const databaseClient =
  await import("../src/features/visitor-globe/db/client.ts");
const { setRedisAdapterForTests } = await import("../src/lib/redis.ts");
const { REDIS_COMMAND_TIMEOUT_MS } = await import("../src/lib/local-redis.ts");

const firstMessage = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ada",
  message: "Hello",
  latitude: 51.5,
  longitude: -0.1,
  country: "United Kingdom",
  city: "London",
};

const secondMessage = {
  ...firstMessage,
  id: "22222222-2222-2222-2222-222222222222",
  name: "Grace",
  message: "Hi",
};

test("visitor messages are loaded once and reused from Redis", async () => {
  const store = createInMemoryRedisAdapter();
  let loads = 0;
  const load = async () => {
    loads += 1;
    return [firstMessage];
  };

  assert.deepEqual(await fetchCachedMessages(load, store), [firstMessage]);
  assert.deepEqual(await fetchCachedMessages(load, store), [firstMessage]);
  assert.equal(loads, 1);
});

test("message snapshots are stored with the bounded cache TTL", async () => {
  let setOptions;
  const store = {
    async get() {
      return null;
    },
    async set(_key, _value, options) {
      setOptions = options;
      return "OK";
    },
    async incr() {
      return 1;
    },
    async eval() {
      return 0;
    },
  };

  await fetchCachedMessages(async () => [], store);
  assert.deepEqual(setOptions, { ex: MESSAGE_CACHE_TTL_SECONDS });
});

test("missing or failed Redis falls back to the database", async () => {
  let loads = 0;
  const load = async () => {
    loads += 1;
    return [firstMessage];
  };

  assert.deepEqual(await fetchCachedMessages(load, null), [firstMessage]);

  const originalError = console.error;
  console.error = () => {};
  try {
    const failedStore = {
      async get() {
        throw new Error("Redis unavailable");
      },
    };
    assert.deepEqual(await fetchCachedMessages(load, failedStore), [
      firstMessage,
    ]);
  } finally {
    console.error = originalError;
  }
  assert.equal(loads, 2);
});

test(
  "a stalled Redis read falls back to the database",
  { timeout: REDIS_COMMAND_TIMEOUT_MS + 500 },
  async () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.deepEqual(
        await fetchCachedMessages(async () => [firstMessage], {
          async get() {
            return new Promise(() => {});
          },
        }),
        [firstMessage],
      );
    } finally {
      console.error = originalError;
    }
  },
);

test("an invalid cached snapshot is replaced from the database", async () => {
  const values = new Map();
  const store = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value) {
      values.set(key, value);
      return "OK";
    },
    async incr(key) {
      const value = Number(values.get(key) ?? 0) + 1;
      values.set(key, value);
      return value;
    },
    async eval() {
      return 0;
    },
  };

  await fetchCachedMessages(async () => [firstMessage], store);
  const snapshotKey = [...values.keys()].find((key) =>
    key.includes(":snapshot:"),
  );
  values.set(snapshotKey, [{ invalid: true }]);

  assert.deepEqual(
    await fetchCachedMessages(async () => [secondMessage], store),
    [secondMessage],
  );
  assert.deepEqual(values.get(snapshotKey), [secondMessage]);
});

test("generation changes prevent a concurrent stale fill from becoming visible", async () => {
  const store = createInMemoryRedisAdapter();
  let releaseLoad;
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const release = new Promise((resolve) => {
    releaseLoad = resolve;
  });

  const staleRead = fetchCachedMessages(async () => {
    markStarted();
    await release;
    return [firstMessage];
  }, store);

  await started;
  assert.equal(await advanceMessageCacheGeneration(store), true);
  releaseLoad();
  assert.deepEqual(await staleRead, [firstMessage]);

  let freshLoads = 0;
  const fresh = await fetchCachedMessages(async () => {
    freshLoads += 1;
    return [firstMessage, secondMessage];
  }, store);
  assert.deepEqual(fresh, [firstMessage, secondMessage]);
  assert.equal(freshLoads, 1);
});

test("cache invalidation failures remain non-fatal", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const failedStore = {
      async incr() {
        throw new Error("Redis unavailable");
      },
    };
    assert.equal(await advanceMessageCacheGeneration(failedStore), false);
  } finally {
    console.error = originalError;
  }
});

test(
  "a committed message remains successful when cache invalidation stalls",
  { timeout: REDIS_COMMAND_TIMEOUT_MS + 500 },
  async () => {
    const id = "33333333-3333-3333-3333-333333333333";
    const fakeDatabase = {
      insert() {
        return {
          values() {
            return {
              async returning() {
                return [{ id }];
              },
            };
          },
        };
      },
    };
    let invalidations = 0;
    databaseClient.setDatabaseForTests(fakeDatabase);
    setRedisAdapterForTests({
      async incr() {
        invalidations += 1;
        return new Promise(() => {});
      },
    });

    const originalError = console.error;
    console.error = () => {};
    try {
      assert.equal(
        await databaseClient.createMessage({
          name: firstMessage.name,
          message: firstMessage.message,
          latitude: firstMessage.latitude,
          longitude: firstMessage.longitude,
          country: firstMessage.country,
          city: firstMessage.city,
        }),
        id,
      );
      assert.equal(invalidations, 1);
    } finally {
      console.error = originalError;
      databaseClient.setDatabaseForTests();
      setRedisAdapterForTests();
    }
  },
);
