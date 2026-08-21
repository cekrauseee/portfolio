import assert from "node:assert/strict";
import test from "node:test";
import { resolveGeoFromHeaders } from "../src/features/guestbook/server/geo.ts";

function headers(values) {
  return new Headers(values);
}

test("resolves valid Vercel coordinates and labels", () => {
  assert.deepEqual(
    resolveGeoFromHeaders(
      headers({
        "x-vercel-ip-latitude": "38.7223",
        "x-vercel-ip-longitude": "-9.1393",
        "x-vercel-ip-country": "PT",
        "x-vercel-ip-city": " Lisbon ",
      }),
    ),
    {
      latitude: 38.7223,
      longitude: -9.1393,
      country: "PT",
      city: "Lisbon",
    },
  );
});

test("returns null when Vercel coordinates are absent, malformed, or out of range", () => {
  assert.equal(resolveGeoFromHeaders(headers()), null);
  assert.equal(
    resolveGeoFromHeaders(
      headers({
        "x-vercel-ip-latitude": "   ",
        "x-vercel-ip-longitude": "  ",
      }),
    ),
    null,
  );
  assert.equal(
    resolveGeoFromHeaders(
      headers({
        "x-vercel-ip-latitude": "not-a-number",
        "x-vercel-ip-longitude": "1",
      }),
    ),
    null,
  );
  assert.equal(
    resolveGeoFromHeaders(
      headers({
        "x-vercel-ip-latitude": "91",
        "x-vercel-ip-longitude": "181",
      }),
    ),
    null,
  );
});
