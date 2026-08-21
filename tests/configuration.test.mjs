import assert from "node:assert/strict";
import test from "node:test";
import { parseGithubProjectsSnapshot } from "../src/content/github-projects.ts";
import {
  MeetingNotificationConfigurationError,
  resolveMeetingNotificationConfiguration,
} from "../src/features/meeting-scheduling/meeting-notification.ts";
import { shouldUseRetryMessage } from "../src/lib/retry-message.ts";
import { validateProductionEnvironment } from "../scripts/validate-production-environment.mjs";
import { syncGithubProjects } from "../scripts/sync-github-projects.mjs";

function restore(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function productionEnvironment(overrides = {}) {
  return {
    GITHUB_OWNER: "fixture-owner",
    DATABASE_URL:
      "postgresql://portfolio:secret@database.example.test/portfolio",
    KV_REST_API_URL: "https://redis.example.test",
    KV_REST_API_TOKEN: "redis-token",
    ANON_SESSION_SECRET: "s".repeat(48),
    OPENAI_API_KEY: "openai-key",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_REFRESH_TOKEN: "google-refresh-token",
    ...overrides,
  };
}

test("GitHub project configuration requires an explicit owner", async () => {
  const previous = process.env.GITHUB_OWNER;
  delete process.env.GITHUB_OWNER;
  try {
    await assert.rejects(
      syncGithubProjects({
        fetchImpl: async () => {
          throw new Error("must not fetch");
        },
      }),
      /GITHUB_OWNER is required/,
    );
    assert.throws(
      () =>
        parseGithubProjectsSnapshot({
          version: 1,
          owner: "test-owner",
          generatedAt: "2026-08-19T00:00:00.000Z",
          projects: [],
        }),
      /GITHUB_OWNER is required/,
    );
  } finally {
    restore("GITHUB_OWNER", previous);
  }
});

test("GitHub snapshots are bound to the configured owner", () => {
  const previous = process.env.GITHUB_OWNER;
  process.env.GITHUB_OWNER = "test-owner";
  try {
    assert.deepEqual(
      parseGithubProjectsSnapshot({
        version: 1,
        owner: "test-owner",
        generatedAt: "2026-08-19T00:00:00.000Z",
        projects: [],
      }),
      [],
    );
    assert.throws(
      () =>
        parseGithubProjectsSnapshot({
          version: 1,
          owner: "other-owner",
          generatedAt: "2026-08-19T00:00:00.000Z",
          projects: [],
        }),
      /Invalid GitHub projects snapshot/,
    );
  } finally {
    restore("GITHUB_OWNER", previous);
  }
});

test("production environment validation requires complete critical configuration", () => {
  assert.deepEqual(validateProductionEnvironment(productionEnvironment()), {
    meetingNotificationEnabled: false,
  });
  assert.throws(
    () =>
      validateProductionEnvironment(
        productionEnvironment({ DATABASE_URL: "" }),
      ),
    /DATABASE_URL is required/,
  );
  assert.throws(
    () =>
      validateProductionEnvironment(
        productionEnvironment({ ANON_SESSION_SECRET: "short" }),
      ),
    /ANON_SESSION_SECRET must contain at least 32 characters/,
  );
  assert.throws(
    () =>
      validateProductionEnvironment(
        productionEnvironment({
          DATABASE_URL: "https://database.example.test",
        }),
      ),
    /DATABASE_URL must be a valid Postgres URL/,
  );
  assert.throws(
    () =>
      validateProductionEnvironment(
        productionEnvironment({ KV_REST_API_URL: "redis://localhost" }),
      ),
    /KV_REST_API_URL must be a valid HTTPS URL/,
  );
});

test("Resend is optional but must be configured as a complete group", () => {
  assert.equal(resolveMeetingNotificationConfiguration({}), undefined);
  assert.throws(
    () =>
      resolveMeetingNotificationConfiguration({
        RESEND_API_KEY: "resend-key",
      }),
    MeetingNotificationConfigurationError,
  );

  const configured = {
    RESEND_API_KEY: "resend-key",
    MEETING_OWNER_EMAIL: "owner@example.com",
    RESEND_FROM_EMAIL: "Portfolio <portfolio@example.com>",
  };
  assert.deepEqual(resolveMeetingNotificationConfiguration(configured), {
    apiKey: "resend-key",
    to: "owner@example.com",
    from: "Portfolio <portfolio@example.com>",
  });
  assert.deepEqual(
    validateProductionEnvironment(productionEnvironment(configured)),
    { meetingNotificationEnabled: true },
  );
});

test("Retry-After UI handling distinguishes temporary outages from missing configuration", () => {
  assert.equal(
    shouldUseRetryMessage(new Response(null, { status: 429 })),
    true,
  );
  assert.equal(
    shouldUseRetryMessage(
      new Response(null, { status: 503, headers: { "Retry-After": "30" } }),
    ),
    true,
  );
  assert.equal(
    shouldUseRetryMessage(new Response(null, { status: 503 })),
    false,
  );
});
