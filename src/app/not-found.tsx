import Link from "next/link";
import { linkSoundProps, mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  return (
    <PageShell locale={locale} navigation={dictionary.navigation}>
      <section aria-labelledby="not-found-heading">
        <p className="text-black/55 dark:text-white/65">404</p>
        <h1
          id="not-found-heading"
          className="mt-1 text-xl leading-7 font-medium tracking-[-0.02em]"
        >
          {dictionary.notFound.title}
        </h1>
        <p className="mt-3 max-w-[42ch] leading-6 text-black/70 dark:text-white/80">
          {dictionary.notFound.description}
        </p>
        <Link
          {...linkSoundProps}
          className={`${mutedTextLinkClassName} mt-5 inline-block`}
          href="/"
        >
          {dictionary.notFound.home}
        </Link>
      </section>
    </PageShell>
  );
}
