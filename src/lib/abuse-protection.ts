import { Redis } from "@upstash/redis";
import { checkBotId } from "botid/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createLocalRedisAdapter, type RedisAdapter } from "@/lib/local-redis";

export const LIMITS = {
  fit: {
    session: { window: 5, day: 20 },
    ip: { window: 25, day: 100 },
    windowSeconds: 600,
  },
  meetings: {
    session: { window: 3, day: 10 },
    ip: { window: 15, day: 50 },
    windowSeconds: 600,
  },
  visitorGlobe: {
    session: { window: 3, day: 10 },
    ip: { window: 15, day: 50 },
    windowSeconds: 600,
  },
} as const;

// A 16,000-character role description can exceed 64 KiB once encoded as JSON.
export const BODY_LIMITS = {
  fit: 128 * 1024,
  meetings: 8 * 1024,
  visitorGlobe: 4 * 1024,
} as const;

type Operation = keyof typeof LIMITS;
type LimitScope = "session" | "ip";
type RedisEnvironment = Record<string, string | undefined>;

export class ProtectionUnavailableError extends Error {
  constructor() {
    super("Protection storage is unavailable.");
    this.name = "ProtectionUnavailableError";
  }
}

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

/** Replace the Redis client for deterministic integration tests. */
export function setRedisAdapterForTests(adapter?: RedisAdapter) {
  redisOverride = adapter;
  redisInstance = undefined;
}

function redis() {
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
      : new Redis(configuration));
}

function sessionSecret() {
  return process.env.ANON_SESSION_SECRET?.trim() || undefined;
}

function digest(value: string) {
  const secret = sessionSecret();
  if (!secret) {
    throw new ProtectionUnavailableError();
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}

const SESSION_TTL = 30 * 24 * 60 * 60;

function issueSession(secret: string) {
  const payload = `${randomBytes(24).toString("base64url")}.${Math.floor(Date.now() / 1000) + SESSION_TTL}`;
  return `${payload}.${createHmac("sha256", secret)
    .update(payload)
    .digest("base64url")}`;
}

function validSession(value: string | undefined, secret: string) {
  if (!value) {
    return false;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [random, expiry, signature] = parts;
  if (
    !/^[A-Za-z0-9_-]{32}$/.test(random) ||
    !/^\d{10,12}$/.test(expiry) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return false;
  }

  const expiresAt = Number(expiry);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const payload = `${random}.${expiry}`;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function cookieValue(request: Request) {
  const match = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)anon_session=([^;]+)/);
  return match?.[1];
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production"
      ? undefined
      : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "local")
  );
}

export type Protection = {
  identity: string;
  sessionCookie?: string;
};

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = redis.call('TTL', KEYS[1])
end
return { count, ttl }
`;

async function incrementRateLimit(
  store: RedisAdapter,
  key: string,
  seconds: number,
) {
  const result = await store.eval<[number, number]>(
    RATE_LIMIT_SCRIPT,
    [key],
    [String(seconds)],
  );
  if (
    !Array.isArray(result) ||
    result.length < 2 ||
    !Number.isFinite(Number(result[0])) ||
    !Number.isFinite(Number(result[1]))
  ) {
    throw new ProtectionUnavailableError();
  }
  return { count: Number(result[0]), ttl: Math.max(1, Number(result[1])) };
}

async function consumeRateLimits(
  store: RedisAdapter,
  operation: Operation,
  scope: LimitScope,
  identity: string,
) {
  const operationLimits = LIMITS[operation];
  const limits = operationLimits[scope];
  let retryAfter = 0;

  for (const [suffix, seconds, limit] of [
    ["10m", operationLimits.windowSeconds, limits.window],
    ["day", 86400, limits.day],
  ] as const) {
    const key = `abuse:${operation}:${scope}:${identity}:${suffix}`;
    const { count, ttl } = await incrementRateLimit(store, key, seconds);
    if (count > limit) {
      retryAfter = Math.max(retryAfter, ttl);
    }
  }

  return retryAfter;
}

export async function protect(
  operation: Operation,
  request: Request,
): Promise<Protection | Response> {
  const secret = sessionSecret();
  const suppliedSession = cookieValue(request);
  const suppliedSessionIsValid = Boolean(
    secret && validSession(suppliedSession, secret),
  );
  const session = secret
    ? suppliedSessionIsValid
      ? suppliedSession!
      : issueSession(secret)
    : undefined;

  const finalize = (response: Response) => {
    if (session && !suppliedSessionIsValid) {
      withSession(response, session);
    }
    return response;
  };

  let bot;
  try {
    bot = await checkBotId({ developmentOptions: { bypass: "ALLOWED" } });
  } catch {
    return finalize(unavailable());
  }
  if (bot.isBot) {
    return finalize(json({ error: "Request denied." }, 403));
  }

  const ip = clientIp(request);
  if (!ip || !session) {
    return finalize(unavailable());
  }

  const store = redis();
  if (!store) {
    return finalize(unavailable());
  }

  const identity = digest(`${session}:${ip}`);
  try {
    const sessionRetry = await consumeRateLimits(
      store,
      operation,
      "session",
      identity,
    );
    const ipRetry = await consumeRateLimits(store, operation, "ip", digest(ip));
    const retryAfter = Math.max(sessionRetry, ipRetry);
    if (retryAfter) {
      return finalize(
        json(
          { error: "Too many requests. Please try again later." },
          429,
          retryAfter,
        ),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "abuse_storage_failure",
        operation,
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
    return finalize(unavailable());
  }

  console.info(
    JSON.stringify({ event: "abuse_decision", operation, outcome: "allowed" }),
  );
  return {
    identity,
    sessionCookie: suppliedSessionIsValid ? undefined : session,
  };
}

export async function acquire(
  key: string,
  ttlSeconds: number,
): Promise<string | false> {
  const store = redis();
  if (!store) {
    throw new ProtectionUnavailableError();
  }

  try {
    const owner = randomBytes(18).toString("base64url");
    return (await store.set(`lock:${key}`, owner, {
      nx: true,
      ex: ttlSeconds,
    })) === "OK"
      ? owner
      : false;
  } catch {
    throw new ProtectionUnavailableError();
  }
}

export async function release(key: string, owner: string | false) {
  if (!owner) {
    return;
  }

  const store = redis();
  if (!store) {
    throw new ProtectionUnavailableError();
  }

  try {
    await store.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      [`lock:${key}`],
      [owner],
    );
  } catch {
    throw new ProtectionUnavailableError();
  }
}

export async function readDedupe<T>(key: string): Promise<T | null> {
  const store = redis();
  if (!store) {
    throw new ProtectionUnavailableError();
  }

  try {
    return (await store.get<T>(`dedupe:${key}`)) ?? null;
  } catch {
    throw new ProtectionUnavailableError();
  }
}

export async function writeDedupe(
  key: string,
  value: unknown,
  ttlSeconds = 86400,
) {
  const store = redis();
  if (!store) {
    throw new ProtectionUnavailableError();
  }

  try {
    await store.set(`dedupe:${key}`, value, { ex: ttlSeconds });
  } catch {
    throw new ProtectionUnavailableError();
  }
}

export async function readJson(request: Request, operation: Operation) {
  const type = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (type !== "application/json") {
    return {
      response: json({ error: "Content-Type must be application/json." }, 400),
    };
  }

  const limit = BODY_LIMITS[operation];
  const declared = request.headers.get("content-length");
  if (
    declared &&
    Number.isFinite(Number(declared)) &&
    Number(declared) > limit
  ) {
    return { response: json({ error: "Request body is too large." }, 413) };
  }
  if (!request.body) {
    return { response: json({ error: "Send request details as JSON." }, 400) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > limit) {
        return { response: json({ error: "Request body is too large." }, 413) };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return {
      body: JSON.parse(
        new TextDecoder().decode(concat(chunks, total)),
      ) as unknown,
    };
  } catch {
    return { response: json({ error: "Send valid JSON." }, 400) };
  }
}

function concat(chunks: Uint8Array[], total: number) {
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function json(body: unknown, status: number, retryAfter?: number) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (retryAfter) {
    headers.set("Retry-After", String(Math.max(1, Math.ceil(retryAfter))));
  }
  return Response.json(body, { status, headers });
}

export function withSession(response: Response, sessionCookie?: string) {
  if (sessionCookie) {
    response.headers.append(
      "Set-Cookie",
      `anon_session=${sessionCookie}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`,
    );
  }
  return response;
}

export function unavailable() {
  return json(
    {
      error:
        "This service is temporarily unavailable. Please try again shortly.",
    },
    503,
    30,
  );
}

export { digest };
