import { Redis } from "@upstash/redis";
import {
  createLocalRedisAdapter,
  REDIS_COMMAND_TIMEOUT_MS,
  type RedisAdapter,
} from "@/lib/local-redis";

type RedisEnvironment = Record<string, string | undefined>;

let redisInstance: RedisAdapter | undefined;
let redisOverride: RedisAdapter | undefined;

export function resolveRedisCredentials(
  environment: RedisEnvironment = process.env,
) {
  const url = environment.KV_REST_API_URL?.trim();
  const token = environment.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : undefined;
}

export function resolveRedisConfiguration(
  environment: RedisEnvironment = process.env,
) {
  const localUrl = environment.REDIS_URL?.trim();
  if (environment.NODE_ENV !== "production" && localUrl) {
    return { kind: "local" as const, url: localUrl };
  }

  const credentials = resolveRedisCredentials(environment);
  return credentials ? { kind: "upstash" as const, ...credentials } : undefined;
}

/** Replace the shared Redis client for deterministic tests. */
export function setRedisAdapterForTests(adapter?: RedisAdapter) {
  redisOverride = adapter;
  redisInstance = undefined;
}

/** Return the shared Redis client when the current environment configures one. */
export function redis() {
  if (redisOverride) {
    return redisOverride;
  }

  const configuration = resolveRedisConfiguration();
  if (!configuration) {
    return undefined;
  }

  return (redisInstance ??=
    configuration.kind === "local"
      ? createLocalRedisAdapter(configuration.url)
      : new Redis({
          ...configuration,
          retry: false,
          signal: () => AbortSignal.timeout(REDIS_COMMAND_TIMEOUT_MS),
        }));
}
