import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultLocale,
  localeDetails,
  localeTag,
  locales,
} from "../src/i18n/config.ts";
import { en } from "../src/i18n/dictionaries/en.ts";
import { ja } from "../src/i18n/dictionaries/ja.ts";
import { pt } from "../src/i18n/dictionaries/pt.ts";
import {
  getDeploymentCountry,
  localeFromCountry,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  parseAcceptLanguage,
  parseLocalePreference,
  PORTUGUESE_COUNTRIES,
  resolveLocale,
} from "../src/i18n/locale.ts";

const dictionaries = { en, pt, ja };

function leafEntries(value) {
  const entries = new Map();

  function visit(current, path) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const [key, child] of Object.entries(current)) {
        visit(child, [...path, key]);
      }
      return;
    }

    assert.equal(
      typeof current,
      "string",
      `Expected a string at ${path.join(".")}`,
    );
    entries.set(path.join("."), current);
  }

  visit(value, []);
  return entries;
}

function interpolationTokens(value) {
  return new Set(
    [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(
      (match) => match[1],
    ),
  );
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

test("locale constants expose the supported locales and deployment tags", () => {
  assert.deepEqual(locales, ["en", "pt", "ja"]);
  assert.equal(defaultLocale, "en");
  assert.deepEqual(
    Object.fromEntries(
      locales.map((locale) => [locale, localeDetails[locale].languageTag]),
    ),
    { en: "en", pt: "pt-BR", ja: "ja" },
  );
  assert.deepEqual(
    locales.map((locale) => localeTag(locale)),
    ["en", "pt-BR", "ja"],
  );
});

test("explicit locale preferences use a validated one-year cookie contract", () => {
  assert.equal(LOCALE_COOKIE_NAME, "portfolio-locale");
  assert.equal(LOCALE_COOKIE_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);
  assert.equal(parseLocalePreference("en"), "en");
  assert.equal(parseLocalePreference("pt"), "pt");
  assert.equal(parseLocalePreference("ja"), "ja");
  assert.equal(parseLocalePreference("pt-BR"), undefined);
  assert.equal(parseLocalePreference("unsupported"), undefined);
  assert.equal(parseLocalePreference(null), undefined);
});

test("deployment country headers prefer Vercel and support Cloudflare fallback", () => {
  assert.equal(
    getDeploymentCountry({
      "X-Vercel-IP-Country": " jp ",
      "CF-IPCountry": "BR",
    }),
    "jp",
  );
  assert.equal(getDeploymentCountry({ "cf-ipcountry": " br " }), "br");
  assert.equal(
    getDeploymentCountry({
      "X-VERCEL-IP-COUNTRY": "  ",
      "Cf-IpCountry": " PT ",
    }),
    "PT",
  );
  assert.equal(getDeploymentCountry({}), undefined);
});

test("deployment countries map Japan and every configured Portuguese country", () => {
  assert.equal(localeFromCountry(" jp "), "ja");
  assert.equal(localeFromCountry("US"), undefined);
  assert.equal(localeFromCountry(""), undefined);
  assert.equal(localeFromCountry("  "), undefined);
  assert.equal(localeFromCountry(null), undefined);

  for (const country of PORTUGUESE_COUNTRIES) {
    assert.equal(
      localeFromCountry(country.toLowerCase()),
      "pt",
      `${country} should use Portuguese`,
    );
  }
});

test("Accept-Language supports exact and regional tags", () => {
  const cases = [
    ["en", "en"],
    ["en-US", "en"],
    ["pt", "pt"],
    ["pt-BR", "pt"],
    ["ja", "ja"],
    ["ja-JP", "ja"],
  ];

  for (const [header, expected] of cases) {
    assert.equal(parseAcceptLanguage(header), expected, header);
  }
});

test("Accept-Language honors quality order and preserves input order for ties", () => {
  assert.equal(parseAcceptLanguage("en;q=0.3, pt-BR;q=0.9, ja-JP;q=0.8"), "pt");
  assert.equal(parseAcceptLanguage("ja;q=0.8, pt;q=0.8"), "ja");
  assert.equal(parseAcceptLanguage("pt;q=0, en;q=0.5"), "en");
  assert.equal(parseAcceptLanguage("en;q=0, pt;q=0"), undefined);
});

test("Accept-Language ignores unsupported, malformed, and wildcard-only values", () => {
  for (const header of [
    undefined,
    null,
    "",
    ",,",
    "fr-FR, de;q=0.9",
    "xx;q=wat",
    "en;q=1.1",
  ]) {
    assert.equal(parseAcceptLanguage(header), undefined, String(header));
  }

  assert.equal(parseAcceptLanguage("*"), undefined);
  assert.equal(parseAcceptLanguage("*;q=1, pt;q=0"), undefined);
  assert.equal(parseAcceptLanguage("*;q=1, pt;q=0.5"), "pt");
  assert.equal(resolveLocale({ acceptLanguage: "*" }), "en");
});

test("locale resolution uses cookie, country, browser, then English precedence", () => {
  assert.equal(
    resolveLocale({ cookie: "ja", country: "BR", acceptLanguage: "en" }),
    "ja",
  );
  assert.equal(resolveLocale({ country: "JP", acceptLanguage: "pt-BR" }), "ja");
  assert.equal(resolveLocale({ country: "US", acceptLanguage: "pt-BR" }), "pt");
  assert.equal(resolveLocale({}), "en");
  assert.equal(
    resolveLocale({ cookie: "pt-BR", country: "US", acceptLanguage: "ja" }),
    "ja",
  );
  assert.equal(resolveLocale({ cookie: "unsupported", country: "US" }), "en");
});

test("all locale dictionaries have the same string structure and interpolation contracts", () => {
  const englishEntries = leafEntries(en);
  const englishPaths = [...englishEntries.keys()];

  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    const entries = leafEntries(dictionary);
    assert.deepEqual(
      [...entries.keys()],
      englishPaths,
      `${locale} dictionary structure differs from English`,
    );

    for (const path of englishPaths) {
      const expectedTokens = interpolationTokens(englishEntries.get(path));
      const actualTokens = interpolationTokens(entries.get(path));
      assert.deepEqual(
        difference(expectedTokens, actualTokens),
        [],
        `${locale}.${path} is missing interpolation tokens`,
      );
      assert.deepEqual(
        difference(actualTokens, expectedTokens),
        [],
        `${locale}.${path} has unexpected interpolation tokens`,
      );
    }
  }

  for (const token of ["count", "max", "name"]) {
    const paths = englishPaths.filter((path) =>
      interpolationTokens(englishEntries.get(path)).has(token),
    );
    assert.ok(paths.length > 0, `English should define {${token}} tokens`);
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      const entries = leafEntries(dictionary);
      for (const path of paths) {
        assert.equal(
          interpolationTokens(entries.get(path)).has(token),
          true,
          `${locale}.${path} must keep {${token}}`,
        );
      }
    }
  }
});

test("Portuguese and Japanese dictionaries contain translated copy", () => {
  const englishEntries = leafEntries(en);
  for (const locale of ["pt", "ja"]) {
    const translatedEntries = leafEntries(dictionaries[locale]);
    const changed = [...englishEntries].filter(
      ([path, value]) => translatedEntries.get(path) !== value,
    );

    assert.ok(
      changed.length > englishEntries.size / 2,
      `${locale} should not be an English placeholder dictionary`,
    );
  }
});
