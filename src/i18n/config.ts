export const locales = ["en", "pt", "ja"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeDetails: Record<
  Locale,
  { languageTag: string; openGraphLocale: string }
> = {
  en: { languageTag: "en", openGraphLocale: "en_US" },
  pt: { languageTag: "pt-BR", openGraphLocale: "pt_BR" },
  ja: { languageTag: "ja", openGraphLocale: "ja_JP" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function localeTag(locale: Locale) {
  return localeDetails[locale].languageTag;
}
