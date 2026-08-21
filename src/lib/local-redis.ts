import { createClient } from "redis";

export type RedisSetOptions = {
  ex?: number;
  nx?: boolean;
};

export type RedisAdapter = {
  set(key: string, value: unknown, options?: RedisSetOptions): Promise<unknown>;
  get<T>(key: string): Promise<T | null>;
  eval<T>(script: string, keys: string[], args: string[]): Promise<T>;
};

export function createLocalRedisAdapter(url: string) {
  const client = createClient({
    url,
    socket: { connectTimeout: 1_000, reconnectStrategy: false },
  });
  client.on("error", () => {
    // Command callers convert connection failures into protection responses.
  });

  let connection: Promise<typeof client> | undefined;
  const connected = () => {
    connection ??= client
      .connect()
      .then(() => client)
      .catch((error) => {
        connection = undefined;
        if (client.isOpen) {
          client.destroy();
        }
        throw error;
      });
    return connection;
  };

  const adapter: RedisAdapter & { close(): Promise<void> } = {
    async set(key, value, options) {
      const redis = await connected();
      return redis.set(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
        {
          ...(options?.ex
            ? { expiration: { type: "EX" as const, value: options.ex } }
            : {}),
          ...(options?.nx ? { condition: "NX" as const } : {}),
        },
      );
    },
    async get<T>(key: string) {
      const value = await (await connected()).get(key);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    },
    async eval<T>(script: string, keys: string[], args: string[]) {
      return (await (
        await connected()
      ).eval(script, { keys, arguments: args })) as T;
    },
    async close() {
      if (client.isOpen) {
        await client.close();
      }
    },
  };

  return adapter;
}
