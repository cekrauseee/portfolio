import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

const pageClassName =
  "flex min-h-dvh min-h-screen min-h-svh flex-col pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))]";

const containerClassName =
  "mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 [@media(max-height:42rem)]:gap-7 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-5";

type PageShellProps = {
  children: ReactNode;
  locale: Locale;
  navigation: Dictionary["navigation"];
  disableTextSelection?: boolean;
  containerClassName?: string;
  showNavigation?: boolean;
};

export function PageShell({
  children,
  locale,
  navigation,
  disableTextSelection = false,
  containerClassName: customContainerClassName,
  showNavigation = true,
}: PageShellProps) {
  return (
    <main
      className={`${pageClassName} ${disableTextSelection ? "select-none" : ""}`}
    >
      <div className={customContainerClassName ?? containerClassName}>
        {showNavigation ? <SiteNavigation dictionary={navigation} /> : null}
        {children}
        <SiteFooter locale={locale} dictionary={navigation} />
      </div>
    </main>
  );
}
