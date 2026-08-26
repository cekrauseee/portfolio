import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_FIT_OPERATION_TIMEOUT_MS } from "../src/app/api/fit/route.ts";
import { ROLE_FIT_REQUEST_TIMEOUT_MS } from "../src/features/role-fit/assess-role-fit.ts";
import { ROLE_FIT_GUARDRAIL_TIMEOUT_MS } from "../src/features/role-fit/guard-role-description.ts";
import {
  CALENDAR_REQUEST_TIMEOUT_MS,
  findMeetingEvent,
  setCalendarClientForTests,
} from "../src/features/meeting-scheduling/google-calendar.ts";
import {
  MEETING_NOTIFICATION_TIMEOUT_MS,
  sendMeetingNotification,
  setMeetingNotificationForTests,
} from "../src/features/meeting-scheduling/meeting-notification.ts";
import { MEETING_OPERATION_TIMEOUT_MS } from "../src/features/meeting-scheduling/schedule-meeting.ts";

test("Google Calendar requests carry the configured deadline", async () => {
  let observedTimeout;
  setCalendarClientForTests({
    events: {
      get: async (_parameters, options) => {
        observedTimeout = options?.timeout;
        const error = new Error("not found");
        error.code = 404;
        throw error;
      },
    },
  });

  try {
    const result = await findMeetingEvent({
      email: "ada@example.com",
      start: new Date("2026-08-20T14:00:00.000Z"),
      end: new Date("2026-08-20T15:00:00.000Z"),
      operation: {
        idempotencyDigest: "a".repeat(64),
        requestDigest: "b".repeat(64),
      },
      config: { calendarId: "primary" },
    });
    assert.equal(result.status, "not-found");
    assert.equal(observedTimeout, CALENDAR_REQUEST_TIMEOUT_MS);
  } finally {
    setCalendarClientForTests();
  }
});

test("optional owner notifications receive a stable provider idempotency key", async () => {
  let observedKey;
  setMeetingNotificationForTests(async (_input, options) => {
    observedKey = options.idempotencyKey;
  });

  try {
    const sent = await sendMeetingNotification(
      {
        name: "Ada",
        email: "ada@example.com",
        start: new Date("2026-08-20T14:00:00.000Z"),
        timeZone: "UTC",
      },
      { idempotencyKey: `meeting-owner/${"a".repeat(64)}` },
    );
    assert.equal(sent, true);
    assert.equal(observedKey, `meeting-owner/${"a".repeat(64)}`);
  } finally {
    setMeetingNotificationForTests();
  }
});

test("meeting lock budget exceeds bounded integration work", () => {
  assert.ok(
    MEETING_OPERATION_TIMEOUT_MS >
      CALENDAR_REQUEST_TIMEOUT_MS + MEETING_NOTIFICATION_TIMEOUT_MS,
  );
});

test("fit operation budget includes guardrail and evaluator deadlines", () => {
  assert.equal(
    ROLE_FIT_OPERATION_TIMEOUT_MS,
    ROLE_FIT_GUARDRAIL_TIMEOUT_MS + ROLE_FIT_REQUEST_TIMEOUT_MS,
  );
});
