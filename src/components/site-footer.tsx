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
    <footer>
      <Preferences locale={locale} dictionary={dictionary} />
    </footer>
  );
}
