import "server-only";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/i18n/dictionaries/en").then((module) => module.en),
  pt: () => import("@/i18n/dictionaries/pt").then((module) => module.pt),
  ja: () => import("@/i18n/dictionaries/ja").then((module) => module.ja),
};

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
