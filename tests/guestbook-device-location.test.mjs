import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEVICE_LOCATION_OPTIONS,
  resolveDeviceLocation,
} from "../src/features/guestbook/device-location.ts";

function permissions(state) {
  return { query: async () => ({ state }) };
}

const featureRoot = fileURLToPath(
  new URL("../src/features/guestbook/", import.meta.url),
);

test("guestbook consumers share one browser geolocation boundary", () => {
  const globe = readFileSync(`${featureRoot}globe/globe.tsx`, "utf8");
  const form = readFileSync(`${featureRoot}message-form.tsx`, "utf8");

  for (const source of [globe, form]) {
    assert.match(source, /resolveDeviceLocation/);
    assert.doesNotMatch(
      source,
      /navigator\.(?:geolocation|permissions)|getCurrentPosition/,
    );
  }
});

test("reuses device coordinates only after geolocation permission is granted", async () => {
  let observedOptions;
  const result = await resolveDeviceLocation("granted-only", {
    permissions: permissions("granted"),
    geolocation: {
      getCurrentPosition(success, _failure, options) {
        observedOptions = options;
        success({ coords: { latitude: -30.0346, longitude: -51.2177 } });
      },
    },
  });

  assert.deepEqual(result, {
    status: "available",
    location: { latitude: -30.0346, longitude: -51.2177 },
  });
  assert.deepEqual(observedOptions, DEVICE_LOCATION_OPTIONS);
});

test("does not prompt when geolocation permission is prompt or denied", async () => {
  let calls = 0;
  const geolocation = {
    getCurrentPosition() {
      calls += 1;
    },
  };

  assert.deepEqual(
    await resolveDeviceLocation("granted-only", {
      permissions: permissions("prompt"),
      geolocation,
    }),
    { status: "not-granted" },
  );
  assert.deepEqual(
    await resolveDeviceLocation("granted-only", {
      permissions: permissions("denied"),
      geolocation,
    }),
    { status: "not-granted" },
  );
  assert.equal(calls, 0);
});

test("falls back when permission or device location cannot be read", async () => {
  assert.deepEqual(
    await resolveDeviceLocation("granted-only", {
      permissions: {
        query: async () => {
          throw new Error("permissions unavailable");
        },
      },
      geolocation: { getCurrentPosition() {} },
    }),
    { status: "unavailable" },
  );

  assert.deepEqual(
    await resolveDeviceLocation("granted-only", {
      permissions: permissions("granted"),
      geolocation: {
        getCurrentPosition(_success, failure) {
          failure({ code: 2 });
        },
      },
    }),
    { status: "unavailable" },
  );

  assert.deepEqual(
    await resolveDeviceLocation("granted-only", {
      permissions: permissions("granted"),
      geolocation: {
        getCurrentPosition(success) {
          success({ coords: { latitude: 91, longitude: 181 } });
        },
      },
    }),
    { status: "unavailable" },
  );
});

test("explicit requests use the same API and preserve denial semantics", async () => {
  let permissionQueries = 0;
  const result = await resolveDeviceLocation("request", {
    permissions: {
      query: async () => {
        permissionQueries += 1;
        return { state: "prompt" };
      },
    },
    geolocation: {
      getCurrentPosition(_success, failure) {
        failure({ code: 1 });
      },
    },
  });

  assert.deepEqual(result, { status: "denied" });
  assert.equal(permissionQueries, 0);
});
