import type { ReactNode } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

const pageClassName =
  "min-h-dvh min-h-screen min-h-svh pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pr-[calc(1rem+env(safe-area-inset-right))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] max-[23rem]:pl-[calc(1rem+env(safe-area-inset-left))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pr-[calc(3rem+env(safe-area-inset-right))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pl-[calc(3rem+env(safe-area-inset-left))]";

const containerClassName =
  "flex w-full max-w-[36rem] flex-col gap-10 [@media(max-height:42rem)]:gap-7 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-5";

type PageShellProps = {
  children: ReactNode;
  locale: Locale;
  navigation: Dictionary["navigation"];
  disableTextSelection?: boolean;
};

export function PageShell({
  children,
  locale,
  navigation,
  disableTextSelection = false,
}: PageShellProps) {
  return (
    <main
      className={`${pageClassName} ${disableTextSelection ? "select-none" : ""}`}
    >
      <div className={containerClassName}>
        <SiteNavigation locale={locale} dictionary={navigation} />
        {children}
      </div>
    </main>
  );
}
