import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'

type PreferencesProps = {
  locale: Locale
  dictionary: Dictionary['navigation']
}

export function Preferences({ locale, dictionary }: PreferencesProps) {
  return (
    <div
      className="flex flex-col items-start gap-1"
      role="group"
      aria-label={dictionary.preferencesNavigation}
    >
      <LanguageSwitcher
        locale={locale}
        labels={dictionary.languages}
        label={dictionary.languageNavigation}
      />
      <ThemeSwitcher labels={dictionary.appearance} label={dictionary.appearanceNavigation} />
    </div>
  )
}
