import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

export const LOCALE_COOKIE_NAME = "portfolio-locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const PORTUGUESE_COUNTRIES = new Set([
  "BR",
  "PT",
  "AO",
  "MZ",
  "CV",
  "GW",
  "ST",
  "TL",
]);

type HeaderSource = Pick<Headers, "get"> | Record<string, string | undefined>;

type LocaleResolutionInput = {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
};

function readHeader(source: HeaderSource, name: string) {
  if ("get" in source && typeof source.get === "function") {
    return source.get(name)?.trim() || undefined;
  }

  const expected = name.toLowerCase();
  const entry = Object.entries(source).find(
    ([key]) => key.toLowerCase() === expected,
  );
  return entry?.[1]?.trim() || undefined;
}

export function parseLocalePreference(value: unknown): Locale | undefined {
  return typeof value === "string" && isLocale(value) ? value : undefined;
}

export function getDeploymentCountry(headers: HeaderSource) {
  return (
    readHeader(headers, "x-vercel-ip-country") ??
    readHeader(headers, "cf-ipcountry")
  );
}

export function localeFromCountry(country: string | null | undefined) {
  const normalized = country?.trim().toUpperCase();
  if (normalized === "JP") {
    return "ja" as const;
  }
  if (normalized && PORTUGUESE_COUNTRIES.has(normalized)) {
    return "pt" as const;
  }
  return undefined;
}

export function localeFromLanguageTag(
  value: string | null | undefined,
): Locale | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const primaryLanguage = normalized.split("-")[0];
  if (
    primaryLanguage === "en" ||
    primaryLanguage === "pt" ||
    primaryLanguage === "ja"
  ) {
    return primaryLanguage;
  }
  return undefined;
}

export function parseAcceptLanguage(
  value: string | null | undefined,
): Locale | undefined {
  if (!value) {
    return undefined;
  }

  const candidates = value
    .split(",")
    .map((part, index) => {
      const [range, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        /^\s*q\s*=/i.test(parameter),
      );
      const quality = qualityParameter
        ? Number(qualityParameter.split("=")[1])
        : 1;

      return {
        index,
        range: range?.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter(
      (candidate): candidate is typeof candidate & { range: string } =>
        Boolean(candidate.range) &&
        candidate.quality > 0 &&
        candidate.quality <= 1,
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index,
    );

  for (const candidate of candidates) {
    const locale = localeFromLanguageTag(candidate.range);
    if (locale) {
      return locale;
    }
  }

  return undefined;
}

export function resolveLocale({
  cookie,
  country,
  acceptLanguage,
}: LocaleResolutionInput): Locale {
  if (isLocale(cookie)) {
    return cookie;
  }

  return (
    localeFromCountry(country) ??
    parseAcceptLanguage(acceptLanguage) ??
    defaultLocale
  );
}

export type { HeaderSource, LocaleResolutionInput };
