import { Redis } from "@upstash/redis";
import { checkBotId } from "botid/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const LIMITS = {
  fit: { window: 5, day: 20, windowSeconds: 600 },
  meetings: { window: 3, day: 10, windowSeconds: 600 },
} as const;
export const BODY_LIMITS = { fit: 32 * 1024, meetings: 8 * 1024 } as const;
type Operation = keyof typeof LIMITS;

export type RedisAdapter = Pick<Redis, "set" | "eval" | "get">;

export class ProtectionUnavailableError extends Error {
  constructor() {
    super("Protection storage is unavailable.");
    this.name = "ProtectionUnavailableError";
  }
}

const memory = new Map<string, { count: number; expires: number }>();
const locks = new Map<string, { owner: string; expires: number }>();
let redisInstance: Redis | undefined;
let redisOverride: RedisAdapter | undefined;
let localSessionSecret: string | undefined;

/** Replace the Redis client for deterministic integration tests. */
export function setRedisAdapterForTests(adapter?: RedisAdapter) {
  redisOverride = adapter;
  redisInstance = undefined;
}

function redis() {
  if (redisOverride) {
    return redisOverride;
  }
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return undefined;
  }
  return (redisInstance ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  }));
}

function sessionSecret() {
  const configured = process.env.ANON_SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  return (localSessionSecret ??= randomBytes(32).toString("base64url"));
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
  const [random, expiry, signature] = value.split(".");
  if (
    !random ||
    !expiry ||
    !signature ||
    Number(expiry) <= Math.floor(Date.now() / 1000)
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
  retryAfter?: number;
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
  const result = await store.eval<[string], [number, number]>(
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

export async function protect(
  operation: Operation,
  request: Request,
): Promise<Protection | Response> {
  const secret = sessionSecret();
  const suppliedSession = cookieValue(request);
  const session = secret
    ? validSession(suppliedSession, secret)
      ? suppliedSession!
      : issueSession(secret)
    : undefined;
  const finalize = (response: Response) => {
    if (
      session &&
      (!suppliedSession || !validSession(suppliedSession, secret!))
    ) {
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
  const identity = digest(`${session}:${ip}`);
  const store = redis();
  if (!store && process.env.NODE_ENV === "production") {
    return finalize(unavailable());
  }
  const now = Date.now();
  const limits = LIMITS[operation];
  let retryAfter = 0;
  try {
    for (const [suffix, seconds, limit] of [
      ["10m", limits.windowSeconds, limits.window],
      ["day", 86400, limits.day],
    ] as const) {
      const key = `abuse:${operation}:${identity}:${suffix}`;
      let count: number;
      let ttl: number;
      if (store) {
        ({ count, ttl } = await incrementRateLimit(store, key, seconds));
      } else {
        const current = memory.get(key);
        const entry =
          !current || current.expires <= now
            ? { count: 1, expires: now + seconds * 1000 }
            : { count: current.count + 1, expires: current.expires };
        memory.set(key, entry);
        count = entry.count;
        ttl = Math.ceil((entry.expires - now) / 1000);
      }
      if (count > limit) {
        retryAfter = Math.max(retryAfter, store ? ttl : ttl);
      }
    }
    // Keep an independent trusted-IP bucket so rotating cookies cannot evade limits.
    const ipIdentity = digest(ip);
    for (const [suffix, seconds, limit] of [
      ["10m", limits.windowSeconds, limits.window],
      ["day", 86400, limits.day],
    ] as const) {
      const key = `abuse:${operation}:ip:${ipIdentity}:${suffix}`;
      let count: number;
      let ttl: number;
      if (store) {
        ({ count, ttl } = await incrementRateLimit(store, key, seconds));
      } else {
        const current = memory.get(key);
        const entry =
          !current || current.expires <= now
            ? { count: 1, expires: now + seconds * 1000 }
            : { count: current.count + 1, expires: current.expires };
        memory.set(key, entry);
        count = entry.count;
        ttl = Math.ceil((entry.expires - now) / 1000);
      }
      if (count > limit) {
        retryAfter = Math.max(retryAfter, ttl);
      }
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
  if (retryAfter) {
    const response = json(
      { error: "Too many requests. Please try again later." },
      429,
      retryAfter,
    );
    if (!validSession(suppliedSession, secret!)) {
      withSession(response, session);
    }
    return response;
  }
  console.info(
    JSON.stringify({ event: "abuse_decision", operation, outcome: "allowed" }),
  );
  return {
    identity,
    sessionCookie: validSession(suppliedSession, secret!) ? undefined : session,
  };
}

export async function acquire(
  key: string,
  ttlSeconds: number,
): Promise<string | false> {
  const store = redis();
  if (!store && process.env.NODE_ENV === "production") {
    throw new ProtectionUnavailableError();
  }
  if (store) {
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
  const now = Date.now();
  const current = locks.get(key);
  if (current && current.expires > now) {
    return false;
  }
  const owner = randomBytes(18).toString("base64url");
  locks.set(key, { owner, expires: now + ttlSeconds * 1000 });
  return owner;
}

export async function release(key: string, owner: string | false) {
  if (!owner) {
    return;
  }
  const store = redis();
  if (store) {
    try {
      await store.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        [`lock:${key}`],
        [owner],
      );
    } catch {
      throw new ProtectionUnavailableError();
    }
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new ProtectionUnavailableError();
  }
  if (locks.get(key)?.owner === owner) {
    locks.delete(key);
  }
}

export async function readDedupe<T>(key: string): Promise<T | null> {
  const store = redis();
  if (!store) {
    if (process.env.NODE_ENV === "production") {
      throw new ProtectionUnavailableError();
    }
    return null;
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
    if (process.env.NODE_ENV === "production") {
      throw new ProtectionUnavailableError();
    }
    return;
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
