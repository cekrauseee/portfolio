import type { GuestbookMessage } from "@/features/guestbook/message";
import { REDIS_COMMAND_TIMEOUT_MS, type RedisAdapter } from "@/lib/local-redis";
import { redis } from "@/lib/redis";

export const MESSAGE_CACHE_TTL_SECONDS = 5 * 60;

// Keep the legacy Redis key stable to avoid an unnecessary cache migration.
const CACHE_PREFIX = "portfolio:visitor-globe:messages:v1";
const GENERATION_KEY = `${CACHE_PREFIX}:generation`;

function snapshotKey(generation: number) {
  return `${CACHE_PREFIX}:snapshot:${generation}`;
}

function parseGeneration(value: unknown) {
  const generation = typeof value === "string" ? Number(value) : value;
  return typeof generation === "number" &&
    Number.isSafeInteger(generation) &&
    generation >= 0
    ? generation
    : undefined;
}

function isGuestbookMessage(value: unknown): value is GuestbookMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    typeof message.name === "string" &&
    typeof message.message === "string" &&
    typeof message.latitude === "number" &&
    Number.isFinite(message.latitude) &&
    typeof message.longitude === "number" &&
    Number.isFinite(message.longitude) &&
    (message.country === null || typeof message.country === "string") &&
    (message.city === null || typeof message.city === "string")
  );
}

function isMessageSnapshot(value: unknown): value is GuestbookMessage[] {
  return Array.isArray(value) && value.every(isGuestbookMessage);
}

async function withRedisCommandDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Redis command timed out.")),
          REDIS_COMMAND_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Read the shared message snapshot, falling back to the database whenever
 * Redis is absent, unavailable, or contains an invalid value.
 */
export async function fetchCachedMessages(
  loadMessages: () => Promise<GuestbookMessage[]>,
  store: RedisAdapter | null | undefined = redis(),
): Promise<GuestbookMessage[]> {
  if (!store) {
    return loadMessages();
  }

  let generation: number;
  let cached: unknown;
  try {
    const storedGeneration = await withRedisCommandDeadline(
      store.get<unknown>(GENERATION_KEY),
    );
    const parsedGeneration =
      storedGeneration === null ? 0 : parseGeneration(storedGeneration);
    if (parsedGeneration === undefined) {
      return loadMessages();
    }
    generation = parsedGeneration;
    cached = await withRedisCommandDeadline(
      store.get<unknown>(snapshotKey(generation)),
    );
  } catch (error) {
    console.error("Unable to read the visitor message cache.", error);
    return loadMessages();
  }

  if (isMessageSnapshot(cached)) {
    return cached;
  }

  const messages = await loadMessages();
  try {
    await withRedisCommandDeadline(
      store.set(snapshotKey(generation), messages, {
        ex: MESSAGE_CACHE_TTL_SECONDS,
      }),
    );
  } catch (error) {
    console.error("Unable to populate the visitor message cache.", error);
  }
  return messages;
}

/**
 * Move future readers to a fresh snapshot after the database commit. Cache
 * failures are non-fatal because Postgres remains the source of truth.
 */
export async function advanceMessageCacheGeneration(
  store: RedisAdapter | null | undefined = redis(),
) {
  if (!store) {
    return false;
  }

  try {
    await withRedisCommandDeadline(store.incr(GENERATION_KEY));
    return true;
  } catch (error) {
    console.error("Unable to invalidate the visitor message cache.", error);
    return false;
  }
}
