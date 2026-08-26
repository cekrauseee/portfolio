import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveGeo,
  resolveGeoFromHeaders,
} from "../src/features/guestbook/server/geo.ts";

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

test("prefers valid submitted device coordinates over Vercel headers", () => {
  const request = new Request("https://example.com/api/guestbook", {
    headers: {
      "x-vercel-ip-latitude": "38.7223",
      "x-vercel-ip-longitude": "-9.1393",
      "x-vercel-ip-country": "PT",
      "x-vercel-ip-city": "Lisbon",
    },
  });

  assert.deepEqual(
    resolveGeo(request, { latitude: -30.0346, longitude: -51.2177 }),
    {
      latitude: -30.0346,
      longitude: -51.2177,
      country: null,
      city: null,
      source: "device",
    },
  );
});

test("falls back to Vercel when submitted device coordinates are invalid", () => {
  const request = new Request("https://example.com/api/guestbook", {
    headers: {
      "x-vercel-ip-latitude": "38.7223",
      "x-vercel-ip-longitude": "-9.1393",
      "x-vercel-ip-country": "PT",
    },
  });

  assert.deepEqual(resolveGeo(request, { latitude: 91, longitude: 181 }), {
    latitude: 38.7223,
    longitude: -9.1393,
    country: "PT",
    city: null,
    source: "vercel",
  });
  assert.equal(
    resolveGeo(new Request("https://example.com/api/guestbook"), {
      latitude: Number.NaN,
      longitude: 0,
    }),
    null,
  );
});
