import { Preferences } from "@/components/preferences";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

export function SiteFooter({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["navigation"];
}) {
  return (
    <footer className="animate-journal-footer mt-auto w-full origin-left motion-reduce:animate-none">
      <Preferences locale={locale} dictionary={dictionary} />
    </footer>
  );
}
