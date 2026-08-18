import type { Metadata } from "next";
import Link from "next/link";
import { MeetingScheduler } from "@/components/meeting-scheduler";
import { SiteNavigation } from "@/components/site-navigation";
import { site } from "@/config/site";

const path = "/schedule";
const title = "Schedule a conversation";
const description =
  "Choose a time for a one-hour conversation with Henrique Krause.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    url: path,
    title,
    description,
    siteName: site.name,
    locale: site.locale,
  },
};

export default function SchedulePage() {
  return (
    <main className="min-h-dvh min-h-screen min-h-svh pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pr-[calc(1rem+env(safe-area-inset-right))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] max-[23rem]:pl-[calc(1rem+env(safe-area-inset-left))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pr-[calc(3rem+env(safe-area-inset-right))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pl-[calc(3rem+env(safe-area-inset-left))]">
      <div className="flex w-full max-w-[42rem] flex-col gap-10 [@media(max-height:42rem)]:gap-7">
        <SiteNavigation />

        <article className="max-w-[65ch]">
          <header>
            <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
              {title}
            </h1>
            <p className="mt-4 text-base leading-7 text-black/75 dark:text-white/85">
              {description}
            </p>
          </header>

          <div className="mt-10">
            <MeetingScheduler />
          </div>

          <footer className="mt-12 [@media(max-height:42rem)]:mt-9">
            <Link
              className="focus-visible:outline-foreground w-fit text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[3px] dark:text-white/75 dark:decoration-white/30 dark:hover:text-white"
              href="/"
            >
              Back
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
