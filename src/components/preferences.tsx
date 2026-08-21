import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

type PreferencesProps = {
  locale: Locale;
  dictionary: Dictionary["navigation"];
  align?: "start" | "end";
};

export function Preferences({
  locale,
  dictionary,
  align = "start",
}: PreferencesProps) {
  const alignmentClassName =
    align === "end" ? "items-end text-end" : "items-start";

  return (
    <div
      className={`flex flex-col gap-1 ${alignmentClassName}`}
      role="group"
      aria-label={dictionary.preferencesNavigation}
    >
      <LanguageSwitcher
        locale={locale}
        labels={dictionary.languages}
        label={dictionary.languageNavigation}
      />
      <ThemeSwitcher
        labels={dictionary.appearance}
        label={dictionary.appearanceNavigation}
      />
    </div>
  );
}
