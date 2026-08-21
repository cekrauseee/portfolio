"use client";

import { preferenceOptionClassName } from "@/components/preference-option";
import { setLocalePreference } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({
  locale,
  labels,
  label,
}: {
  locale: Locale;
  labels: Record<Locale, string>;
  label: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-xs text-black/55 dark:text-white/65">
        {label}
      </legend>
      <form
        action={setLocalePreference}
        className="mt-1 flex max-w-full flex-wrap items-center gap-x-2 gap-y-1"
      >
        {locales.map((candidate) => (
          <button
            className={`${preferenceOptionClassName} ${candidate === locale ? "font-medium underline" : ""}`}
            type="submit"
            name="locale"
            value={candidate}
            aria-pressed={candidate === locale}
            key={candidate}
          >
            {labels[candidate]}
          </button>
        ))}
      </form>
    </fieldset>
  );
}
