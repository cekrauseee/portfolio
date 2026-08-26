import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";
import {
  guestbookErrorMessage,
  parseGuestbookErrorCode,
} from "../src/features/guestbook/errors.ts";
import { createGuestbookPost } from "../src/features/guestbook/server/handler.ts";
import {
  GUESTBOOK_MODERATION_INSTRUCTIONS,
  MODERATION_CLIENT_OPTIONS,
  MODERATION_MODEL,
  MODERATION_REQUEST_TIMEOUT_MS,
  moderateMessage,
} from "../src/features/guestbook/server/moderate-message.ts";
import { en } from "../src/i18n/dictionaries/en.ts";
import { GUARDRAIL_DECISION_TEXT_CONFIG } from "../src/lib/guardrail-decision.ts";

function restore(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function request(body = { name: "Ada", message: "Hello from the test." }) {
  return new Request("http://localhost/api/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    protect: async (_operation, _request, observe) => {
      observe?.({ outcome: "allowed", stage: "rate_limit" });
      return {
        identity: "privacy-safe-identity",
        sessionCookie: "signed-session",
      };
    },
    readJson: async (incoming) => ({ body: await incoming.json() }),
    resolveGeo: () => ({
      latitude: 0,
      longitude: 0,
      country: null,
      city: null,
      source: "vercel",
    }),
    moderateMessage: async () => ({ status: "approved" }),
    createMessage: async () => ({
      id: "message-id",
      cacheInvalidated: true,
    }),
    logOperation: () => {},
    ...overrides,
  };
}

async function errorCode(response) {
  return (await response.json()).error.code;
}

test("guestbook errors use stable codes and non-numeric retry guidance", () => {
  const payload = { error: { code: "rate_limited", operationId: "operation" } };
  const code = parseGuestbookErrorCode(payload);
  assert.equal(code, "rate_limited");
  assert.equal(
    guestbookErrorMessage(code, en.guestbook.form),
    en.guestbook.form.rateLimited,
  );
  assert.doesNotMatch(en.guestbook.form.rateLimited, /\d/);
  assert.equal(
    parseGuestbookErrorCode({ error: "old internal message" }),
    undefined,
  );
});

test("guestbook moderation is bounded, non-retrying, and privacy-safe", async () => {
  assert.deepEqual(MODERATION_CLIENT_OPTIONS, {
    timeout: MODERATION_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
  assert.ok(MODERATION_REQUEST_TIMEOUT_MS > 0);

  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  let observedRequest;
  try {
    const result = await moderateMessage(
      "Ada",
      "Hello from the test.",
      "privacy-safe-identity",
      {
        openai: {
          responses: {
            parse: async (input) => {
              observedRequest = input;
              return {
                output_parsed: { approved: true },
                _request_id: "req_test",
              };
            },
          },
        },
      },
    );

    assert.deepEqual(result, {
      status: "approved",
      requestId: "req_test",
    });
    assert.equal(observedRequest.model, MODERATION_MODEL);
    assert.equal(
      observedRequest.instructions,
      GUESTBOOK_MODERATION_INSTRUCTIONS,
    );
    assert.doesNotMatch(
      GUESTBOOK_MODERATION_INSTRUCTIONS,
      /JSON object|no Markdown|no explanation/i,
    );
    assert.deepEqual(JSON.parse(observedRequest.input), {
      name: "Ada",
      message: "Hello from the test.",
    });
    assert.deepEqual(observedRequest.text, GUARDRAIL_DECISION_TEXT_CONFIG);
    assert.equal(observedRequest.reasoning.effort, "none");
    assert.equal(observedRequest.store, false);
    assert.equal(observedRequest.safety_identifier, "privacy-safe-identity");
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook moderation classifies timeout diagnostics without logging content", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  try {
    const result = await moderateMessage("Ada", "Private message", undefined, {
      openai: {
        responses: {
          parse: async () => {
            throw new OpenAI.APIConnectionTimeoutError();
          },
        },
      },
    });

    assert.equal(result.status, "failed");
    assert.equal(result.failure.reason, "timeout");
    assert.doesNotMatch(JSON.stringify(result), /Private message|Ada/);
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook endpoint returns semantic configuration and temporary errors", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  const logs = [];
  try {
    process.env.OPENAI_API_KEY = "   ";
    const unconfigured = await createGuestbookPost(
      dependencies({
        logOperation: (event) => logs.push(event),
        moderateMessage: async () => {
          throw new Error("must not moderate");
        },
      }),
    )(request());
    assert.equal(unconfigured.status, 503);
    assert.equal(unconfigured.headers.get("Retry-After"), null);
    assert.equal(await errorCode(unconfigured), "service_unavailable");
    assert.match(
      unconfigured.headers.get("Set-Cookie") ?? "",
      /signed-session/,
    );

    process.env.OPENAI_API_KEY = "test-openai-key";
    const unavailable = await createGuestbookPost(
      dependencies({
        logOperation: (event) => logs.push(event),
        moderateMessage: async () => ({
          status: "failed",
          failure: {
            kind: "APIConnectionTimeoutError",
            reason: "timeout",
          },
        }),
      }),
    )(request());
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("Retry-After"), "30");
    assert.equal(await errorCode(unavailable), "service_unavailable");
    assert.equal(logs.length, 2);
    assert.equal(logs[1].moderation.failure.reason, "timeout");
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook endpoint rejects missing geo before moderation or persistence", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  let moderated = false;
  let created = false;
  try {
    const response = await createGuestbookPost(
      dependencies({
        resolveGeo: () => null,
        moderateMessage: async () => {
          moderated = true;
          return { status: "approved" };
        },
        createMessage: async () => {
          created = true;
          return { id: "message-id", cacheInvalidated: true };
        },
      }),
    )(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), null);
    assert.equal(await errorCode(response), "location_unavailable");
    assert.match(response.headers.get("Set-Cookie") ?? "", /signed-session/);
    assert.equal(moderated, false);
    assert.equal(created, false);
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook forwards submitted device coordinates and logs their source", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  const logs = [];
  let observedLocation;
  let persisted;
  try {
    const response = await createGuestbookPost(
      dependencies({
        resolveGeo: (_request, location) => {
          observedLocation = location;
          return {
            ...location,
            country: null,
            city: null,
            source: "device",
          };
        },
        createMessage: async (input) => {
          persisted = input;
          return { id: "message-id", cacheInvalidated: true };
        },
        logOperation: (event) => logs.push(event),
      }),
    )(
      request({
        name: "Ada",
        message: "Hello from the test.",
        location: { latitude: -30.0346, longitude: -51.2177 },
      }),
    );

    assert.equal(response.status, 201);
    assert.deepEqual(observedLocation, {
      latitude: -30.0346,
      longitude: -51.2177,
    });
    assert.equal(persisted.latitude, -30.0346);
    assert.equal(persisted.longitude, -51.2177);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].location_source, "device");
    assert.doesNotMatch(JSON.stringify(logs[0]), /-30\.0346|-51\.2177/);
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook logs one privacy-safe wide event for a published message", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  const logs = [];
  try {
    const response = await createGuestbookPost(
      dependencies({ logOperation: (event) => logs.push(event) }),
    )(request());

    assert.equal(response.status, 201);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, "guestbook_submission");
    assert.equal(logs[0].outcome, "published");
    assert.equal(logs[0].http_status, 201);
    assert.equal(logs[0].operation_id, response.headers.get("X-Operation-Id"));
    assert.deepEqual(logs[0].input, { name_length: 3, message_length: 20 });
    assert.equal(logs[0].moderation.outcome, "approved");
    assert.equal(logs[0].persistence.cache_invalidated, true);
    assert.equal(logs[0].location_source, "vercel");
    assert.doesNotMatch(
      JSON.stringify(logs[0]),
      /Ada|Hello from the test|privacy-safe-identity/,
    );
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook logging failures do not change a completed submission", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  const originalError = console.error;
  const fallbackLogs = [];
  process.env.OPENAI_API_KEY = "test-openai-key";
  console.error = (value) => fallbackLogs.push(String(value));
  try {
    const response = await createGuestbookPost(
      dependencies({
        logOperation: () => {
          throw new Error("logger unavailable");
        },
      }),
    )(request());

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(fallbackLogs.length, 1);
    assert.match(fallbackLogs[0], /guestbook_logging_failure/);
    assert.doesNotMatch(fallbackLogs[0], /Ada|Hello from the test/);
  } finally {
    console.error = originalError;
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook normalizes protection responses without exposing retry duration in the body", async () => {
  const logs = [];
  const response = await createGuestbookPost(
    dependencies({
      protect: async (_operation, _request, observe) => {
        observe?.({
          outcome: "rate_limited",
          stage: "rate_limit",
          retry_after_seconds: 47,
        });
        return Response.json(
          { error: "Too many requests." },
          { status: 429, headers: { "Retry-After": "47" } },
        );
      },
      logOperation: (event) => logs.push(event),
    }),
  )(request());

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "47");
  const payload = await response.json();
  assert.equal(payload.error.code, "rate_limited");
  assert.deepEqual(Object.keys(payload.error).sort(), ["code", "operationId"]);
  assert.equal("retryAfter" in payload.error, false);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].protection.retry_after_seconds, 47);
});
