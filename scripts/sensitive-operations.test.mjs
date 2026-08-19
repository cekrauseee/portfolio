import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.ANON_SESSION_SECRET = "test-only-secret";
process.env.OPENAI_API_KEY = "test-key";

const { createFitPost } = await import("../src/app/api/fit/route.ts");
const meetingsRoute = await import("../src/app/api/meetings/route.ts");
const scheduling =
  await import("../src/features/meeting-scheduling/schedule-meeting.ts");
const calendar =
  await import("../src/features/meeting-scheduling/google-calendar.ts");
const notification =
  await import("../src/features/meeting-scheduling/meeting-notification.ts");
const abuse = await import("../src/lib/abuse-protection.ts");
const { retryMessage } = await import("../src/lib/retry-message.ts");

function response(status, body = { error: "blocked" }, headers = {}) {
  return Response.json(body, { status, headers });
}

function jsonRequest(path, body, headers = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function protection(overrides = {}) {
  return {
    identity: "stable-test-identity",
    sessionCookie: "session-cookie",
    ...overrides,
  };
}

function assertCookie(result) {
  assert.match(
    result.headers.get("set-cookie") ?? "",
    /anon_session=session-cookie/,
  );
}

test("fit handler rejects BotID, content type, rate, and config guards without invoking assessment", async () => {
  let calls = 0;
  const assess = async () => {
    calls += 1;
    return "answer";
  };
  const blocked = createFitPost({
    protect: async () => abuse.withSession(response(403), "session-cookie"),
    assessRoleFit: assess,
  });
  const blockedResult = await blocked(
    jsonRequest("/api/fit", { description: "x" }),
  );
  assert.equal(blockedResult.status, 403);
  assertCookie(blockedResult);
  const malformed = createFitPost({
    protect: async () => protection(),
    readJson: abuse.readJson,
    assessRoleFit: assess,
  });
  assert.equal(
    (
      await malformed(
        jsonRequest("/api/fit", {}, { "content-type": "text/plain" }),
      )
    ).status,
    400,
  );
  const malformedResult = await malformed(
    jsonRequest("/api/fit", {}, { "content-type": "text/plain" }),
  );
  assertCookie(malformedResult);
  const rateLimited = createFitPost({
    protect: async () =>
      abuse.withSession(
        response(429, {}, { "Retry-After": "17" }),
        "session-cookie",
      ),
    assessRoleFit: assess,
  });
  const limited = await rateLimited(jsonRequest("/api/fit", {}));
  assert.equal(limited.status, 429);
  assert.equal(Number.parseInt(limited.headers.get("Retry-After"), 10), 17);
  assertCookie(limited);
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const unconfigured = createFitPost({
    protect: async () => protection(),
    readJson: abuse.readJson,
    assessRoleFit: assess,
  });
  assert.equal(
    (
      await unconfigured(
        jsonRequest("/api/fit", { description: "valid description" }),
      )
    ).status,
    503,
  );
  process.env.OPENAI_API_KEY = previousKey;
  assert.equal(calls, 0);
});

test("fit handler calls assessment once with a stable privacy-safe identifier", async () => {
  const identifiers = [];
  const handler = createFitPost({
    protect: async () => protection(),
    assessRoleFit: async (_description, identifier) => {
      identifiers.push(identifier);
      return "answer";
    },
    acquire: async () => "owner",
    release: async () => {},
  });
  const result = await handler(
    jsonRequest("/api/fit", { description: "Build APIs" }),
  );
  assert.equal(result.status, 200);
  assert.deepEqual(identifiers, ["stable-test-identity"]);
  assert.equal(identifiers[0].includes("Build APIs"), false);
  assertCookie(result);
});

test("fit preserves a successful assessment when lock release fails", async () => {
  const logs = [];
  const previousError = console.error;
  console.error = (message) => logs.push(String(message));
  let calls = 0;
  try {
    const handler = createFitPost({
      protect: async () => protection(),
      assessRoleFit: async () => {
        calls += 1;
        return "answer";
      },
      acquire: async () => "owner",
      release: async () => {
        throw new Error("redis payload-secret must not be logged");
      },
    });
    const result = await handler(
      jsonRequest("/api/fit", { description: "Build APIs" }),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { answer: "answer" });
    assert.equal(calls, 1);
    assert.match(logs.join("\n"), /abuse_lock_release_failure/);
    assert.equal(
      logs.some((message) => message.includes("payload-secret")),
      false,
    );
  } finally {
    console.error = previousError;
  }
});

function validMeeting(name = "Ada") {
  const start = new Date(Date.now() + 3 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const local = start.toISOString().slice(0, 16);
  return {
    name,
    email: `${name.toLowerCase()}@example.com`,
    start: local,
    timeZone: "UTC",
  };
}

function meetingDeps(overrides = {}) {
  const store = new Map();
  const locks = new Set();
  return {
    protect: async () => protection(),
    readJson: async (request) => ({ body: await request.json() }),
    validateMeetingRequest: scheduling.validateMeetingRequest,
    meetingUtcSlot: scheduling.meetingUtcSlot,
    digest: (value) => `digest:${value}`,
    acquire: async (key) => {
      if (locks.has(key)) {
        return false;
      }
      locks.add(key);
      return `owner:${key}`;
    },
    release: async (key) => locks.delete(key),
    readDedupe: async (key) => store.get(key) ?? null,
    writeDedupe: async (key, value) => store.set(key, value),
    scheduleMeeting: async () => ({
      meetLink: "https://meet.test/x",
      calendarLink: "https://calendar.test/x",
    }),
    ...overrides,
  };
}

test("meetings early and catch responses carry session cookie and avoid scheduling", async () => {
  let calls = 0;
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        throw new Error("must not run");
      },
    }),
  );
  const protectedResult = await meetingsRoute.createMeetingsPost(
    meetingDeps({
      protect: async () => abuse.withSession(response(403), "session-cookie"),
      scheduleMeeting: async () => {
        calls += 1;
        throw new Error("must not run");
      },
    }),
  )(jsonRequest("/api/meetings", validMeeting()));
  assert.equal(protectedResult.status, 403);
  assertCookie(protectedResult);
  const missingKey = await handler(
    jsonRequest("/api/meetings", validMeeting()),
  );
  assert.equal(missingKey.status, 400);
  assertCookie(missingKey);
  const invalid = await handler(
    jsonRequest(
      "/api/meetings",
      { ...validMeeting(), email: "bad" },
      { "Idempotency-Key": "a" },
    ),
  );
  assert.equal(invalid.status, 400);
  assertCookie(invalid);
  const failed = await meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        throw new Error("upstream");
      },
    }),
  )(jsonRequest("/api/meetings", validMeeting(), { "Idempotency-Key": "b" }));
  assert.equal(failed.status, 502);
  assertCookie(failed);
  assert.equal(calls, 1);
});

test("meetings preserve a created event when dedupe and lock cleanup fail", async () => {
  const logs = [];
  const previousError = console.error;
  console.error = (message) => logs.push(String(message));
  let scheduleCalls = 0;
  let writeCalls = 0;
  let releaseCalls = 0;
  try {
    const handler = meetingsRoute.createMeetingsPost(
      meetingDeps({
        scheduleMeeting: async () => {
          scheduleCalls += 1;
          return { meetLink: "meet", calendarLink: "calendar" };
        },
        writeDedupe: async () => {
          writeCalls += 1;
          throw new Error("redis payload-secret must not be logged");
        },
        release: async () => {
          releaseCalls += 1;
          throw new Error("redis lock payload-secret must not be logged");
        },
      }),
    );
    const result = await handler(
      jsonRequest("/api/meetings", validMeeting(), {
        "Idempotency-Key": "post-success-failure",
      }),
    );
    assert.equal(result.status, 201);
    assert.deepEqual(await result.json(), {
      ok: true,
      meetLink: "meet",
      calendarLink: "calendar",
    });
    assert.equal(scheduleCalls, 1);
    assert.equal(writeCalls, 1);
    assert.equal(releaseCalls, 3);
    assert.match(logs.join("\n"), /meeting_dedupe_persistence_failure/);
    assert.match(logs.join("\n"), /abuse_lock_release_failure/);
    assert.equal(
      logs.some((message) => message.includes("payload-secret")),
      false,
    );
  } finally {
    console.error = previousError;
  }
});

test("meeting idempotency rejects mismatched payloads and replays matching payloads", async () => {
  let calls = 0;
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        return { meetLink: "meet", calendarLink: "calendar" };
      },
    }),
  );
  const firstBody = validMeeting();
  const first = await handler(
    jsonRequest("/api/meetings", firstBody, { "Idempotency-Key": "same" }),
  );
  const replay = await handler(
    jsonRequest("/api/meetings", firstBody, { "Idempotency-Key": "same" }),
  );
  const mismatch = await handler(
    jsonRequest(
      "/api/meetings",
      { ...firstBody, name: "Grace" },
      { "Idempotency-Key": "same" },
    ),
  );
  assert.equal(first.status, 201);
  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), await first.clone().json());
  assert.equal(mismatch.status, 409);
  assert.equal(calls, 1);
});

test("concurrent same-key different payloads cannot schedule twice", async () => {
  const firstBody = validMeeting("Ada");
  let calls = 0;
  let releaseFirst;
  const entered = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        await entered;
        return { meetLink: "meet", calendarLink: "calendar" };
      },
    }),
  );
  const firstPromise = handler(
    jsonRequest("/api/meetings", firstBody, { "Idempotency-Key": "race" }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const inProgress = await handler(
    jsonRequest(
      "/api/meetings",
      { ...firstBody, name: "Grace" },
      { "Idempotency-Key": "race" },
    ),
  );
  assert.equal(inProgress.status, 429);
  assert.match(inProgress.headers.get("retry-after"), /^\d+$/);
  releaseFirst();
  assert.equal((await firstPromise).status, 201);
  const mismatch = await handler(
    jsonRequest(
      "/api/meetings",
      { ...firstBody, name: "Grace" },
      { "Idempotency-Key": "race" },
    ),
  );
  assert.equal(mismatch.status, 409);
  assert.equal(calls, 1);
});

test("concurrent same-key matching payloads replay without a second schedule", async () => {
  const body = validMeeting();
  let calls = 0;
  let releaseFirst;
  const entered = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        await entered;
        return { meetLink: "meet", calendarLink: "calendar" };
      },
    }),
  );
  const firstPromise = handler(
    jsonRequest("/api/meetings", body, { "Idempotency-Key": "replay-race" }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const inProgress = await handler(
    jsonRequest("/api/meetings", body, {
      "Idempotency-Key": "replay-race",
    }),
  );
  assert.equal(inProgress.status, 429);
  releaseFirst();
  const first = await firstPromise;
  const replay = await handler(
    jsonRequest("/api/meetings", body, {
      "Idempotency-Key": "replay-race",
    }),
  );
  assert.equal(first.status, 201);
  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), await first.clone().json());
  assert.equal(calls, 1);
});

test("meeting slot ownership permits at most one concurrent schedule call", async () => {
  const firstBody = validMeeting();
  let calls = 0;
  const locks = new Set();
  let releaseFirst;
  const entered = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      protect: async (operation, request) =>
        protection({ identity: request.headers.get("x-client") ?? "a" }),
      acquire: async (key) => {
        if (locks.has(key)) {
          return false;
        }
        locks.add(key);
        return key;
      },
      release: async (key) => locks.delete(key),
      scheduleMeeting: async () => {
        calls += 1;
        await entered;
        return { meetLink: "meet" };
      },
    }),
  );
  const firstPromise = handler(
    jsonRequest("/api/meetings", firstBody, {
      "Idempotency-Key": "one",
      "x-client": "a",
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = await handler(
    jsonRequest("/api/meetings", firstBody, {
      "Idempotency-Key": "two",
      "x-client": "b",
    }),
  );
  releaseFirst();
  const first = await firstPromise;
  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
  assert.equal(calls, 1);
});

test("Redis branch uses atomic lock operations and owner compare-and-delete", async () => {
  const values = new Map();
  const scripts = [];
  const fakeRedis = {
    async incr(key) {
      const next = Number(values.get(key) ?? 0) + 1;
      values.set(key, next);
      return next;
    },
    async expire() {},
    async set(key, value, options) {
      if (options?.nx && values.has(key)) {
        return null;
      }
      values.set(key, value);
      return "OK";
    },
    async get(key) {
      return values.get(key) ?? null;
    },
    async eval(script, keys, args) {
      scripts.push(script);
      if (script.includes("INCR")) {
        const count = Number(values.get(keys[0]) ?? 0) + 1;
        values.set(keys[0], count);
        return [count, 600];
      }
      if (values.get(keys[0]) === args[0]) {
        values.delete(keys[0]);
        return 1;
      }
      return 0;
    },
  };
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  abuse.setRedisAdapterForTests(fakeRedis);
  const first = await abuse.acquire("redis-lock", 30);
  assert.ok(first);
  assert.equal(await abuse.acquire("redis-lock", 30), false);
  values.set("lock:redis-lock", "new-owner");
  await abuse.release("redis-lock", first);
  assert.equal(values.get("lock:redis-lock"), "new-owner");
  await abuse.release("redis-lock", "new-owner");
  assert.equal(values.has("lock:redis-lock"), false);
  const allowed = await abuse.protect(
    "fit",
    jsonRequest("/api/fit", {}, { "x-vercel-forwarded-for": "192.0.2.44" }),
  );
  assert.equal(allowed instanceof Response, false);
  assert.ok([...values.keys()].some((key) => key.startsWith("abuse:fit:")));
  assert.ok(scripts.filter((script) => script.includes("INCR")).length >= 4);
  assert.ok(
    scripts
      .filter((script) => script.includes("INCR"))
      .every((script) => script.includes("EXPIRE")),
  );
  await abuse.writeDedupe("redis-dedupe", { ok: true });
  assert.deepEqual(await abuse.readDedupe("redis-dedupe"), { ok: true });
  abuse.setRedisAdapterForTests();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

test("Redis dedupe errors fail closed before a meeting upstream call", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let calls = 0;
  process.env.NODE_ENV = "production";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  abuse.setRedisAdapterForTests({
    async set() {
      return "OK";
    },
    async get() {
      throw new Error("redis down");
    },
    async eval() {
      return 1;
    },
  });
  try {
    const handler = meetingsRoute.createMeetingsPost(
      meetingDeps({
        protect: async () => protection(),
        acquire: abuse.acquire,
        release: abuse.release,
        readDedupe: abuse.readDedupe,
        scheduleMeeting: async () => {
          calls += 1;
          return { meetLink: "must-not-run" };
        },
      }),
    );
    const result = await handler(
      jsonRequest("/api/meetings", validMeeting(), {
        "Idempotency-Key": "redis-dedupe-error",
      }),
    );
    assert.equal(result.status, 503);
    assert.match(result.headers.get("retry-after"), /^\d+$/);
    assertCookie(result);
    assert.equal(calls, 0);
  } finally {
    abuse.setRedisAdapterForTests();
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

test("calendar event IDs are deterministic and existing events replay without notification", async () => {
  const inserted = [];
  let duplicate = false;
  const existing = {
    id: "placeholder",
    htmlLink: "calendar",
    start: { dateTime: "" },
    end: { dateTime: "" },
    attendees: [{ email: "ada@example.com" }],
    conferenceData: { entryPoints: [{ entryPointType: "video", uri: "meet" }] },
  };
  const client = {
    freebusy: {
      query: async () => ({ data: { calendars: { primary: { busy: [] } } } }),
    },
    events: {
      insert: async (input) => {
        inserted.push(input);
        if (duplicate) {
          const error = new Error("duplicate");
          error.code = 409;
          throw error;
        }
        duplicate = true;
        existing.id = input.requestBody.id;
        existing.start = input.requestBody.start;
        existing.end = input.requestBody.end;
        return { data: { ...existing } };
      },
      get: async () => {
        if (!duplicate) {
          const error = new Error("not found");
          error.code = 404;
          throw error;
        }
        return { data: { ...existing } };
      },
    },
  };
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  process.env.GOOGLE_REFRESH_TOKEN = "refresh";
  calendar.setCalendarClientForTests(client);
  let notifications = 0;
  notification.setMeetingNotificationForTests(async () => {
    notifications += 1;
  });
  const request = validMeeting();
  const first = await scheduling.scheduleMeeting(request);
  const second = await scheduling.scheduleMeeting(request);
  assert.equal(inserted.length, 1);
  assert.equal(first.id, inserted[0].requestBody.id);
  assert.equal(first.meetLink, second.meetLink);
  assert.equal(notifications, 1);
  existing.start = { dateTime: "mismatched" };
  await assert.rejects(
    scheduling.scheduleMeeting(request),
    scheduling.MeetingConflictError,
  );
  calendar.setCalendarClientForTests();
  notification.setMeetingNotificationForTests();
});

test("a retry replays a created calendar event when dedupe persistence failed", async () => {
  const body = validMeeting();
  const inserted = [];
  let event;
  let eventGets = 0;
  let freeBusyCalls = 0;
  let notifications = 0;
  const client = {
    freebusy: {
      query: async () => {
        freeBusyCalls += 1;
        return { data: { calendars: { primary: { busy: [] } } } };
      },
    },
    events: {
      insert: async (input) => {
        inserted.push(input);
        event = {
          id: input.requestBody.id,
          htmlLink: "https://calendar.test/replay",
          start: input.requestBody.start,
          end: input.requestBody.end,
          attendees: [{ email: body.email.toUpperCase() }],
          conferenceData: {
            entryPoints: [
              { entryPointType: "video", uri: "https://meet.test/replay" },
            ],
          },
        };
        return { data: event };
      },
      get: async () => {
        eventGets += 1;
        if (!event) {
          const error = new Error("not found");
          error.code = 404;
          throw error;
        }
        return { data: event };
      },
    },
  };
  calendar.setCalendarClientForTests(client);
  notification.setMeetingNotificationForTests(async () => {
    notifications += 1;
  });
  try {
    const handler = meetingsRoute.createMeetingsPost(
      meetingDeps({
        scheduleMeeting: scheduling.scheduleMeeting,
        writeDedupe: async () => {
          throw new Error("redis unavailable");
        },
      }),
    );
    const first = await handler(
      jsonRequest("/api/meetings", body, {
        "Idempotency-Key": "calendar-replay",
      }),
    );
    const replay = await handler(
      jsonRequest("/api/meetings", body, {
        "Idempotency-Key": "calendar-replay",
      }),
    );
    assert.equal(first.status, 201);
    assert.equal(replay.status, 201);
    assert.deepEqual(await replay.json(), await first.clone().json());
    assert.equal(inserted.length, 1);
    assert.equal(freeBusyCalls, 1);
    assert.equal(eventGets, 2);
    assert.equal(notifications, 1);
  } finally {
    calendar.setCalendarClientForTests();
    notification.setMeetingNotificationForTests();
  }
});

test("a deterministic event mismatch is a generic meeting conflict", async () => {
  const request = validMeeting();
  const start = new Date(`${request.start}:00Z`);
  const client = {
    freebusy: {
      query: async () => ({ data: { calendars: { primary: { busy: [] } } } }),
    },
    events: {
      get: async () => ({
        data: {
          id: calendar.meetingEventId(start),
          start: { dateTime: start.toISOString() },
          end: {
            dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
          },
          attendees: [{ email: "someone-else@example.com" }],
        },
      }),
      insert: async () => {
        throw new Error("must not insert");
      },
    },
  };
  calendar.setCalendarClientForTests(client);
  try {
    await assert.rejects(
      scheduling.scheduleMeeting(request),
      scheduling.MeetingConflictError,
    );
  } finally {
    calendar.setCalendarClientForTests();
  }
});

test("calendar lookup continues after a 404 but surfaces real upstream errors", async () => {
  const request = validMeeting();
  const start = new Date(`${request.start}:00Z`);
  let freeBusyCalls = 0;
  const notFoundClient = {
    freebusy: {
      query: async () => {
        freeBusyCalls += 1;
        return { data: { calendars: { primary: { busy: [] } } } };
      },
    },
    events: {
      get: async () => {
        const error = new Error("not found");
        error.response = { status: 404 };
        throw error;
      },
      insert: async () => ({
        data: {
          id: "created",
          start: { dateTime: start.toISOString() },
          end: {
            dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
          },
          attendees: [{ email: request.email }],
          conferenceData: {
            entryPoints: [{ entryPointType: "video", uri: "meet" }],
          },
        },
      }),
    },
  };
  calendar.setCalendarClientForTests(notFoundClient);
  notification.setMeetingNotificationForTests(async () => {});
  try {
    await scheduling.scheduleMeeting(request);
    assert.equal(freeBusyCalls, 1);

    calendar.setCalendarClientForTests({
      ...notFoundClient,
      events: {
        ...notFoundClient.events,
        get: async () => {
          const error = new Error("upstream");
          error.response = { status: 503 };
          throw error;
        },
      },
    });
    await assert.rejects(scheduling.scheduleMeeting(request), /upstream/);
  } finally {
    calendar.setCalendarClientForTests();
    notification.setMeetingNotificationForTests();
  }
});

test("shared UI retry message handles valid, invalid, and missing Retry-After values", () => {
  assert.equal(
    retryMessage(response(429, {}, { "Retry-After": "12" })),
    "Please wait 12 seconds before trying again.",
  );
  assert.equal(
    retryMessage(response(503, {}, { "Retry-After": "1" })),
    "Please wait 1 second before trying again.",
  );
  assert.equal(
    retryMessage(response(429, {}, { "Retry-After": "later" })),
    "Please wait a moment before trying again.",
  );
  assert.equal(
    retryMessage(response(429)),
    "Please wait a moment before trying again.",
  );
});
