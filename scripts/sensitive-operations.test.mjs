import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/github-projects.json", import.meta.url),
    "utf8",
  ),
);
process.env.NODE_ENV = "test";
process.env.ANON_SESSION_SECRET = "test-only-secret";
process.env.OPENAI_API_KEY = "test-key";
process.env.MEETING_OWNER_NAME = "Test Owner";
process.env.GITHUB_OWNER ||= fixture.owner;

const { createFitPost } = await import("../src/app/api/fit/route.ts");
const meetingsRoute = await import("../src/app/api/meetings/route.ts");
const scheduling =
  await import("../src/features/meeting-scheduling/schedule-meeting.ts");
const calendar =
  await import("../src/features/meeting-scheduling/google-calendar.ts");
const notification =
  await import("../src/features/meeting-scheduling/meeting-notification.ts");
const scheduler =
  await import("../src/features/meeting-scheduling/meeting-scheduler.tsx");
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

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function meetingOperation(seed = "default") {
  return {
    idempotencyDigest: hash(`idempotency:${seed}`),
    requestDigest: hash(`request:${seed}`),
  };
}

function validMeeting(name = "Ada") {
  const start = new Date(Date.now() + 3 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  return {
    name,
    email: `${name.toLowerCase()}@example.com`,
    start: start.toISOString().slice(0, 16),
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
    digest: hash,
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

function notFound() {
  const error = new Error("not found");
  error.code = 404;
  return error;
}

function conflict() {
  const error = new Error("conflict");
  error.code = 409;
  return error;
}

function confirmedEvent(input, links = {}) {
  return {
    ...input.requestBody,
    id: input.eventId ?? input.requestBody.id,
    status: "confirmed",
    htmlLink: links.calendarLink ?? "https://calendar.test/event",
    conferenceData: {
      entryPoints: [
        {
          entryPointType: "video",
          uri: links.meetLink ?? "https://meet.test/event",
        },
      ],
    },
  };
}

test("fit guards avoid upstream calls and preserve the anonymous session", async () => {
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
  const malformedResult = await malformed(
    jsonRequest("/api/fit", {}, { "content-type": "text/plain" }),
  );
  assert.equal(malformedResult.status, 400);
  assertCookie(malformedResult);

  const limited = await createFitPost({
    protect: async () =>
      abuse.withSession(
        response(429, {}, { "Retry-After": "17" }),
        "session-cookie",
      ),
    assessRoleFit: assess,
  })(jsonRequest("/api/fit", {}));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "17");
  assertCookie(limited);
  assert.equal(calls, 0);
});

test("fit passes only the stable privacy-safe identifier upstream", async () => {
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

test("meeting endpoint requires an idempotency key and validates before scheduling", async () => {
  let calls = 0;
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        throw new Error("must not run");
      },
    }),
  );

  const missing = await handler(jsonRequest("/api/meetings", validMeeting()));
  assert.equal(missing.status, 400);
  assertCookie(missing);

  const invalid = await handler(
    jsonRequest(
      "/api/meetings",
      { ...validMeeting(), email: "bad" },
      { "Idempotency-Key": "invalid" },
    ),
  );
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);
});

test("meeting endpoint binds a key to one canonical request and replays it", async () => {
  let calls = 0;
  const operations = [];
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async (_meeting, operation) => {
        calls += 1;
        operations.push(operation);
        return {
          meetLink: "https://meet.test/x",
          calendarLink: "https://calendar.test/x",
        };
      },
    }),
  );
  const body = validMeeting();
  const first = await handler(
    jsonRequest("/api/meetings", body, { "Idempotency-Key": "same" }),
  );
  const replay = await handler(
    jsonRequest("/api/meetings", body, { "Idempotency-Key": "same" }),
  );
  const mismatch = await handler(
    jsonRequest(
      "/api/meetings",
      { ...body, name: "Grace" },
      { "Idempotency-Key": "same" },
    ),
  );

  assert.equal(first.status, 201);
  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), await first.clone().json());
  assert.equal(mismatch.status, 409);
  assert.equal(calls, 1);
  assert.match(operations[0].idempotencyDigest, /^[a-f0-9]{64}$/);
  assert.match(operations[0].requestDigest, /^[a-f0-9]{64}$/);
});

test("concurrent meeting requests cannot own the same operation or slot", async () => {
  const body = validMeeting();
  let calls = 0;
  let continueFirst;
  const entered = new Promise((resolve) => {
    continueFirst = resolve;
  });
  const handler = meetingsRoute.createMeetingsPost(
    meetingDeps({
      scheduleMeeting: async () => {
        calls += 1;
        await entered;
        return {
          meetLink: "https://meet.test/x",
          calendarLink: "https://calendar.test/x",
        };
      },
    }),
  );

  const firstPromise = handler(
    jsonRequest("/api/meetings", body, { "Idempotency-Key": "race" }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const duplicate = await handler(
    jsonRequest("/api/meetings", body, { "Idempotency-Key": "race" }),
  );
  assert.equal(duplicate.status, 429);
  assert.match(duplicate.headers.get("Retry-After"), /^\d+$/);

  const otherKey = await handler(
    jsonRequest("/api/meetings", body, { "Idempotency-Key": "other" }),
  );
  assert.equal(otherKey.status, 429);

  continueFirst();
  assert.equal((await firstPromise).status, 201);
  assert.equal(calls, 1);
});

test("post-success Redis cleanup failures do not erase a created meeting", async () => {
  const logs = [];
  const originalError = console.error;
  console.error = (message) => logs.push(String(message));
  try {
    const handler = meetingsRoute.createMeetingsPost(
      meetingDeps({
        scheduleMeeting: async () => ({
          meetLink: "https://meet.test/x",
          calendarLink: "https://calendar.test/x",
        }),
        writeDedupe: async () => {
          throw new Error("payload-secret");
        },
        release: async () => {
          throw new Error("lock-secret");
        },
      }),
    );
    const result = await handler(
      jsonRequest("/api/meetings", validMeeting(), {
        "Idempotency-Key": "post-success",
      }),
    );
    assert.equal(result.status, 201);
    assert.deepEqual(await result.json(), {
      ok: true,
      meetLink: "https://meet.test/x",
      calendarLink: "https://calendar.test/x",
    });
    assert.match(logs.join("\n"), /meeting_dedupe_persistence_failure/);
    assert.match(logs.join("\n"), /abuse_lock_release_failure/);
    assert.doesNotMatch(logs.join("\n"), /payload-secret|lock-secret/);
  } finally {
    console.error = originalError;
  }
});

test("Calendar replay requires matching private operation metadata", async () => {
  const request = validMeeting();
  const firstOperation = meetingOperation("first");
  const secondOperation = meetingOperation("second");
  let event;
  let inserts = 0;
  let notifications = 0;

  const client = {
    freebusy: {
      query: async () => ({ data: { calendars: { primary: { busy: [] } } } }),
    },
    events: {
      get: async () => {
        if (!event) {
          throw notFound();
        }
        return { data: event };
      },
      insert: async (input) => {
        if (event) {
          throw conflict();
        }
        inserts += 1;
        event = confirmedEvent(input);
        return { data: event };
      },
      update: async () => {
        throw new Error("must not update");
      },
    },
  };

  calendar.setCalendarClientForTests(client);
  notification.setMeetingNotificationForTests(async () => {
    notifications += 1;
  });
  try {
    const first = await scheduling.scheduleMeeting(request, firstOperation);
    const replay = await scheduling.scheduleMeeting(request, firstOperation);
    assert.equal(first.meetLink, replay.meetLink);
    assert.equal(inserts, 1);
    assert.equal(notifications, 1);
    assert.deepEqual(
      event.extendedProperties.private,
      calendar.meetingEventMetadata(firstOperation),
    );

    await assert.rejects(
      scheduling.scheduleMeeting(request, secondOperation),
      scheduling.MeetingConflictError,
    );
    assert.equal(inserts, 1);
    assert.equal(notifications, 1);
  } finally {
    calendar.setCalendarClientForTests();
    notification.setMeetingNotificationForTests();
  }
});

test("cancelled deterministic events are restored and never replayed", async () => {
  const request = validMeeting();
  const operation = meetingOperation("cancelled");
  const start = new Date(`${request.start}:00Z`);
  let event = {
    id: calendar.meetingEventId(start),
    status: "cancelled",
  };
  let inserts = 0;
  let updates = 0;
  let updateInput;
  let notifications = 0;

  const client = {
    freebusy: {
      query: async () => ({ data: { calendars: { primary: { busy: [] } } } }),
    },
    events: {
      get: async () => ({ data: event }),
      insert: async () => {
        inserts += 1;
        throw conflict();
      },
      update: async (input) => {
        updates += 1;
        updateInput = input;
        event = confirmedEvent(input, {
          meetLink: "https://meet.test/restored",
          calendarLink: "https://calendar.test/restored",
        });
        return { data: event };
      },
    },
  };

  calendar.setCalendarClientForTests(client);
  notification.setMeetingNotificationForTests(async () => {
    notifications += 1;
  });
  try {
    const restored = await scheduling.scheduleMeeting(request, operation);
    assert.equal(restored.replayed, false);
    assert.equal(restored.meetLink, "https://meet.test/restored");
    assert.equal(inserts, 1);
    assert.equal(updates, 1);
    assert.equal(notifications, 1);
    assert.equal(event.status, "confirmed");
    assert.equal(
      updateInput.requestBody.conferenceData.createRequest.requestId,
      `meeting-${calendar.meetingEventId(start)}-${operation.idempotencyDigest.slice(0, 16)}`,
    );

    const replay = await scheduling.scheduleMeeting(request, operation);
    assert.equal(replay.replayed, true);
    assert.equal(updates, 1);
    assert.equal(notifications, 1);
  } finally {
    calendar.setCalendarClientForTests();
    notification.setMeetingNotificationForTests();
  }
});

test("an ambiguous success recovers only with the original idempotency key", async () => {
  const body = validMeeting();
  let event;
  let inserts = 0;
  let notifications = 0;
  const client = {
    freebusy: {
      query: async () => ({ data: { calendars: { primary: { busy: [] } } } }),
    },
    events: {
      get: async () => {
        if (!event) {
          throw notFound();
        }
        return { data: event };
      },
      insert: async (input) => {
        if (event) {
          throw conflict();
        }
        inserts += 1;
        event = confirmedEvent(input, {
          meetLink: "https://meet.test/recovered",
          calendarLink: "https://calendar.test/recovered",
        });
        return { data: event };
      },
      update: async () => {
        throw new Error("must not update");
      },
    },
  };

  calendar.setCalendarClientForTests(client);
  notification.setMeetingNotificationForTests(async () => {
    notifications += 1;
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const handler = meetingsRoute.createMeetingsPost(
      meetingDeps({
        scheduleMeeting: scheduling.scheduleMeeting,
        writeDedupe: async () => {
          throw new Error("redis unavailable after calendar success");
        },
      }),
    );

    const first = await handler(
      jsonRequest("/api/meetings", body, {
        "Idempotency-Key": "calendar-recovery",
      }),
    );
    const replay = await handler(
      jsonRequest("/api/meetings", body, {
        "Idempotency-Key": "calendar-recovery",
      }),
    );
    const unrelated = await handler(
      jsonRequest("/api/meetings", body, {
        "Idempotency-Key": "different-key",
      }),
    );

    assert.equal(first.status, 201);
    assert.equal(replay.status, 201);
    assert.deepEqual(await replay.json(), await first.clone().json());
    assert.equal(unrelated.status, 409);
    assert.equal(inserts, 1);
    assert.equal(notifications, 1);
  } finally {
    console.error = originalError;
    calendar.setCalendarClientForTests();
    notification.setMeetingNotificationForTests();
  }
});

test("Calendar lookup ignores only 404 and surfaces real upstream failures", async () => {
  const request = validMeeting();
  const operation = meetingOperation("lookup");
  let freeBusyCalls = 0;
  const client = {
    freebusy: {
      query: async () => {
        freeBusyCalls += 1;
        return { data: { calendars: { primary: { busy: [] } } } };
      },
    },
    events: {
      get: async () => {
        throw notFound();
      },
      insert: async (input) => ({ data: confirmedEvent(input) }),
      update: async () => {
        throw new Error("must not update");
      },
    },
  };

  calendar.setCalendarClientForTests(client);
  notification.setMeetingNotificationForTests(async () => {});
  try {
    await scheduling.scheduleMeeting(request, operation);
    assert.equal(freeBusyCalls, 1);

    calendar.setCalendarClientForTests({
      ...client,
      events: {
        ...client.events,
        get: async () => {
          const error = new Error("upstream");
          error.response = { status: 503 };
          throw error;
        },
      },
    });
    await assert.rejects(
      scheduling.scheduleMeeting(request, meetingOperation("upstream")),
      /upstream/,
    );
  } finally {
    calendar.setCalendarClientForTests();
    notification.setMeetingNotificationForTests();
  }
});

test("the browser keeps one idempotency key for the same canonical payload", async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const payload = {
    name: "Ada",
    email: "ada@example.com",
    start: "2026-08-20T14:00:00",
    timeZone: "UTC",
  };
  const keys = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];
  let created = 0;
  const createKey = () => keys[created++];

  const first = await scheduler.resolveMeetingIdempotency(
    payload,
    undefined,
    storage,
    createKey,
  );
  const retry = await scheduler.resolveMeetingIdempotency(
    payload,
    first,
    storage,
    createKey,
  );
  const reload = await scheduler.resolveMeetingIdempotency(
    payload,
    undefined,
    storage,
    createKey,
  );
  const changed = await scheduler.resolveMeetingIdempotency(
    { ...payload, start: "2026-08-20T15:00:00" },
    first,
    storage,
    createKey,
  );

  assert.equal(retry.key, first.key);
  assert.equal(reload.key, first.key);
  assert.notEqual(changed.key, first.key);
  assert.equal(created, 2);

  scheduler.removeStoredIdempotency(storage);
  assert.equal(values.size, 0);
});

test("shared retry guidance supports rate limits and temporary outages", () => {
  assert.equal(
    retryMessage(response(429, {}, { "Retry-After": "12" })),
    "Please wait 12 seconds before trying again.",
  );
  assert.equal(
    retryMessage(response(503, {}, { "Retry-After": "1" })),
    "Please wait 1 second before trying again.",
  );
  assert.equal(
    retryMessage(response(503, {}, { "Retry-After": "later" })),
    "Please wait a moment before trying again.",
  );
});
