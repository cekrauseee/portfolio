import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultThemePreference,
  parseThemePreference,
  serializeThemeCookie,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  themePreferences,
} from "../src/theme/config.ts";

test("theme preferences have an exact system, light, and dark contract", () => {
  assert.deepEqual(themePreferences, ["system", "light", "dark"]);
  assert.equal(defaultThemePreference, "system");
  assert.equal(parseThemePreference("system"), "system");
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(parseThemePreference("dark"), "dark");
  assert.equal(parseThemePreference(undefined), "system");
  assert.equal(parseThemePreference(null), "system");
  assert.equal(parseThemePreference("sepia"), "system");
  assert.equal(parseThemePreference(42), "system");
});

test("theme preference cookie is readable, scoped, same-site, and valid for one year", () => {
  assert.equal(THEME_COOKIE_NAME, "portfolio-theme");
  assert.equal(THEME_COOKIE_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);

  const cookie = serializeThemeCookie("dark");
  assert.match(cookie, /^portfolio-theme=dark;/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /HttpOnly/i);
  assert.doesNotMatch(cookie, /Secure/);
  assert.match(serializeThemeCookie("light", true), /Secure/);
});
