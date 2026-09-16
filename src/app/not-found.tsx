import Link from 'next/link'
import { linkSoundProps, softLinkClassName } from '@/components/links'
import { PageShell } from '@/components/page-shell'
import { profile } from '@/content/portfolio'
import { motion } from '@/lib/motion'
import { getDictionary } from '@/i18n/get-dictionary'
import { getRequestLocale } from '@/i18n/request-locale'

export default async function NotFound() {
  const locale = await getRequestLocale()
  const dictionary = await getDictionary(locale)

  return (
    <PageShell locale={locale} navigation={dictionary.navigation} className="flex-1">
      <p className="animate-journal-enter text-sm font-medium text-black lowercase motion-reduce:animate-none dark:text-white">
        {profile.name}.
      </p>
      <section
        aria-labelledby="not-found-heading"
        className="flex flex-1 flex-col justify-center py-10 lowercase"
      >
        <header className="animate-journal-enter motion-reduce:animate-none">
          <p className="-ml-1 text-7xl leading-none font-medium tracking-[-0.06em] text-black dark:text-white">
            404
          </p>
          <h1
            id="not-found-heading"
            className="mt-5 text-2xl leading-tight font-medium tracking-tight text-balance text-black dark:text-white"
          >
            {dictionary.notFound.title}
          </h1>
        </header>
        <div
          className="animate-journal-enter mt-3 motion-reduce:animate-none"
          style={{ animationDelay: `${motion.stagger.section}ms` }}
        >
          <p className="max-w-[36ch] text-pretty">{dictionary.notFound.description}</p>
          <Link {...linkSoundProps} className={`${softLinkClassName} mt-6 -ml-4`} href="/">
            {dictionary.notFound.home}
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
