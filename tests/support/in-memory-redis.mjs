export function createInMemoryRedisAdapter() {
  const values = new Map();

  const readEntry = (key) => {
    const entry = values.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      values.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    async set(key, value, options) {
      if (options?.nx && readEntry(key)) {
        return null;
      }
      values.set(key, {
        value,
        ...(options?.ex ? { expiresAt: Date.now() + options.ex * 1_000 } : {}),
      });
      return "OK";
    },
    async get(key) {
      return readEntry(key)?.value ?? null;
    },
    async incr(key) {
      const current = readEntry(key);
      const count = Number(current?.value ?? 0) + 1;
      values.set(key, { value: count });
      return count;
    },
    async eval(script, keys, args) {
      if (script.includes("INCR")) {
        const key = keys[0];
        const current = readEntry(key);
        const count = Number(current?.value ?? 0) + 1;
        const expiresAt =
          current?.expiresAt ?? Date.now() + Number(args[0]) * 1_000;
        values.set(key, { value: count, expiresAt });
        return [
          count,
          Math.max(1, Math.ceil((expiresAt - Date.now()) / 1_000)),
        ];
      }

      if (script.includes("redis.call('get'") && script.includes("ARGV[1]")) {
        const entry = readEntry(keys[0]);
        if (entry?.value === args[0]) {
          values.delete(keys[0]);
          return 1;
        }
        return 0;
      }

      if (script.includes("redis.call('del'")) {
        return keys.reduce(
          (count, key) => count + Number(values.delete(key)),
          0,
        );
      }

      throw new Error("Unsupported in-memory Redis test script.");
    },
  };
}
