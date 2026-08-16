import Link from "next/link";
import { SiteNavigation } from "@/components/site-navigation";

export default function NotFound() {
  return (
    <main className="min-h-screen min-h-svh min-h-dvh pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pr-[calc(1rem+env(safe-area-inset-right))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] max-[23rem]:pl-[calc(1rem+env(safe-area-inset-left))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pr-[calc(3rem+env(safe-area-inset-right))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pl-[calc(3rem+env(safe-area-inset-left))]">
      <div className="flex w-full max-w-[26rem] flex-col gap-8 [@media(max-height:42rem)]:gap-6 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-4">
        <SiteNavigation />

        <section aria-labelledby="not-found-heading">
          <p className="text-black/55 dark:text-white/65">404</p>
          <h1
            id="not-found-heading"
            className="mt-1 text-xl leading-7 font-medium tracking-[-0.02em]"
          >
            Page not found
          </h1>
          <p className="mt-3 max-w-[42ch] leading-6 text-black/70 dark:text-white/80">
            There is nothing at this address.
          </p>
          <Link
            className="mt-5 inline-block text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground dark:text-white/75 dark:decoration-white/30 dark:hover:text-white"
            href="/"
          >
            Return to portfolio
          </Link>
        </section>
      </div>
    </main>
  );
}
