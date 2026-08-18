import type { ReactNode } from "react";
import { SiteNavigation } from "@/components/site-navigation";

const pageClassName =
  "min-h-dvh min-h-screen min-h-svh pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pr-[calc(1rem+env(safe-area-inset-right))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] max-[23rem]:pl-[calc(1rem+env(safe-area-inset-left))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pr-[calc(3rem+env(safe-area-inset-right))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pl-[calc(3rem+env(safe-area-inset-left))]";

const containerClassNames = {
  compact:
    "flex w-full max-w-[26rem] flex-col gap-8 [@media(max-height:42rem)]:gap-6 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-4",
  content:
    "flex w-full max-w-[42rem] flex-col gap-10 [@media(max-height:42rem)]:gap-7",
} as const;

type PageShellProps = {
  children: ReactNode;
  size?: keyof typeof containerClassNames;
  disableTextSelection?: boolean;
};

export function PageShell({
  children,
  size = "content",
  disableTextSelection = false,
}: PageShellProps) {
  return (
    <main
      className={`${pageClassName} ${disableTextSelection ? "select-none" : ""}`}
    >
      <div className={containerClassNames[size]}>
        <SiteNavigation />
        {children}
      </div>
    </main>
  );
}
