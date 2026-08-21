import { locales, type Locale } from "@/i18n/config";
import { setLocalePreference } from "@/i18n/actions";

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
    <form
      action={setLocalePreference}
      className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1"
      aria-label={label}
    >
      {locales.map((candidate) => (
        <button
          className={`focus-visible:outline-foreground inline-flex min-h-6 cursor-pointer touch-manipulation items-center px-0.5 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-[3px] ${candidate === locale ? "font-medium underline" : ""}`}
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
  );
}
