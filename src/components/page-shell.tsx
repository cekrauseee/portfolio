import type { ReactNode } from 'react'
import { LocaleTransition } from '@/components/locale-transition'
import { SiteFooter } from '@/components/site-footer'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'

const pageClassName =
  'flex min-h-dvh min-h-screen min-h-svh flex-col pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] has-[.portfolio-content]:h-dvh has-[.portfolio-content]:min-h-dvh has-[.portfolio-content]:overflow-y-auto has-[.portfolio-content]:[overflow-anchor:none] has-[.portfolio-content]:[scrollbar-width:none] has-[.portfolio-content]:[&::-webkit-scrollbar]:hidden'

const containerClassName =
  'portfolio-content mx-auto flex w-full max-w-xl flex-col gap-10 overflow-clip px-8 pb-2 text-[0.9375rem] leading-relaxed font-normal text-black/65 sm:gap-12 dark:text-white/70'

type PageShellProps = {
  children: ReactNode
  locale: Locale
  navigation: Dictionary['navigation']
  className?: string
}

export function PageShell({ children, locale, navigation, className = '' }: PageShellProps) {
  return (
    <main className={pageClassName}>
      <LocaleTransition locale={locale} className={`${containerClassName} ${className}`}>
        {children}
        <SiteFooter locale={locale} dictionary={navigation} />
      </LocaleTransition>
    </main>
  )
}
