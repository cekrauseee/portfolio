import type { ReactNode } from "react";
import { LocaleTransition } from "@/components/locale-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

const pageClassName =
  "flex min-h-dvh min-h-screen min-h-svh flex-col pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] has-[.home-project-focus]:h-dvh has-[.home-project-focus]:min-h-dvh has-[.home-project-focus]:overflow-y-auto has-[.home-project-focus]:[overflow-anchor:none] has-[.home-project-focus]:[scrollbar-gutter:stable]";

const containerClassName =
  "mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 [@media(max-height:42rem)]:gap-7 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-5";

type PageShellProps = {
  children: ReactNode;
  locale: Locale;
  navigation: Dictionary["navigation"];
  containerClassName?: string;
  showNavigation?: boolean;
};

export function PageShell({
  children,
  locale,
  navigation,
  containerClassName: customContainerClassName,
  showNavigation = true,
}: PageShellProps) {
  return (
    <main className={pageClassName}>
      <LocaleTransition
        locale={locale}
        className={customContainerClassName ?? containerClassName}
      >
        {showNavigation ? <SiteNavigation dictionary={navigation} /> : null}
        {children}
        <SiteFooter locale={locale} dictionary={navigation} />
      </LocaleTransition>
    </main>
  );
}
