import type { Metadata } from "next";
import Link from "next/link";
import { linkSoundProps, mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { RoleFitForm } from "@/features/role-fit/role-fit-form";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";
import { requestMetadata } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  return requestMetadata(
    locale,
    "/fit",
    dictionary.fit.title,
    dictionary.fit.description,
  );
}

export default async function FitPage() {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  return (
    <PageShell locale={locale} navigation={dictionary.navigation}>
      <article className="max-w-[65ch]">
        <header>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
            {dictionary.fit.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-black/75 dark:text-white/85">
            {dictionary.fit.description}
          </p>
        </header>

        <div className="mt-10">
          <RoleFitForm locale={locale} dictionary={dictionary.fit.form} />
        </div>

        <footer className="mt-12 [@media(max-height:42rem)]:mt-9">
          <Link {...linkSoundProps} className={mutedTextLinkClassName} href="/">
            {dictionary.fit.back}
          </Link>
        </footer>
      </article>
    </PageShell>
  );
}
