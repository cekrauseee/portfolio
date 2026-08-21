import type { Metadata } from "next";
import Link from "next/link";
import { mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { MeetingScheduler } from "@/features/meeting-scheduling/meeting-scheduler";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";
import { requestMetadata } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  return requestMetadata(
    locale,
    "/schedule",
    dictionary.schedule.title,
    dictionary.schedule.description,
  );
}

export default async function SchedulePage() {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  return (
    <PageShell locale={locale} navigation={dictionary.navigation}>
      <article className="max-w-[65ch]">
        <header>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
            {dictionary.schedule.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-black/75 dark:text-white/85">
            {dictionary.schedule.description}
          </p>
        </header>

        <div className="mt-10">
          <MeetingScheduler
            locale={locale}
            dictionary={dictionary.schedule.form}
            retry={dictionary.retry}
          />
        </div>

        <footer className="mt-12 [@media(max-height:42rem)]:mt-9">
          <Link className={mutedTextLinkClassName} href="/">
            {dictionary.schedule.back}
          </Link>
        </footer>
      </article>
    </PageShell>
  );
}
