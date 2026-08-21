import assert from "node:assert/strict";
import test from "node:test";
import { createGuestbookPost } from "../src/features/guestbook/server/handler.ts";
import {
  MODERATION_CLIENT_OPTIONS,
  MODERATION_REQUEST_TIMEOUT_MS,
  moderateMessage,
} from "../src/features/guestbook/server/moderate-message.ts";

function restore(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function request() {
  return new Request("http://localhost/api/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ada", message: "Hello from the test." }),
  });
}

function dependencies(overrides = {}) {
  return {
    protect: async () => ({
      identity: "privacy-safe-identity",
      sessionCookie: "signed-session",
    }),
    readJson: async (incoming) => ({ body: await incoming.json() }),
    resolveGeo: () => ({
      latitude: 0,
      longitude: 0,
      country: null,
      city: null,
    }),
    moderateMessage: async () => ({ approved: true }),
    createMessage: async () => "message-id",
    ...overrides,
  };
}

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
            create: async (input) => {
              observedRequest = input;
              return { output_text: '{"approved": true}' };
            },
          },
        },
      },
    );

    assert.deepEqual(result, { approved: true });
    assert.equal(observedRequest.store, false);
    assert.equal(observedRequest.safety_identifier, "privacy-safe-identity");
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});

test("guestbook endpoint distinguishes missing configuration from temporary failure", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_API_KEY = "   ";
    const unconfigured = await createGuestbookPost(
      dependencies({
        moderateMessage: async () => {
          throw new Error("must not moderate");
        },
      }),
    )(request());
    assert.equal(unconfigured.status, 503);
    assert.equal(unconfigured.headers.get("Retry-After"), null);
    assert.match(
      unconfigured.headers.get("Set-Cookie") ?? "",
      /signed-session/,
    );

    process.env.OPENAI_API_KEY = "test-openai-key";
    const unavailable = await createGuestbookPost(
      dependencies({ moderateMessage: async () => null }),
    )(request());
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("Retry-After"), "30");
  } finally {
    restore("OPENAI_API_KEY", previousApiKey);
  }
});
