export const locales = ['en', 'fr', 'es', 'pt', 'ja'] as const

export type Locale = (typeof locales)[number]

// Notes are published independently and currently have only these translations.
// Keep this order separate from the full interface locale order.
export const noteLocales = ['en', 'pt', 'ja'] as const

export type NoteLocale = (typeof noteLocales)[number]

export const defaultLocale: Locale = 'en'

export const localeDetails: Record<Locale, { languageTag: string; openGraphLocale: string }> = {
  en: { languageTag: 'en', openGraphLocale: 'en_US' },
  fr: { languageTag: 'fr', openGraphLocale: 'fr_FR' },
  es: { languageTag: 'es', openGraphLocale: 'es_ES' },
  pt: { languageTag: 'pt-BR', openGraphLocale: 'pt_BR' },
  ja: { languageTag: 'ja', openGraphLocale: 'ja_JP' },
}

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale)
}

export function localeTag(locale: Locale) {
  return localeDetails[locale].languageTag
}
