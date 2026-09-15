import type { Metadata, ResolvingMetadata } from 'next'
import { Fragment } from 'react'
import { HomeActions } from '@/components/home-actions'
import { Guestbook } from '@/features/guestbook/guestbook'
import { MeetingScheduler } from '@/features/meeting-scheduling/meeting-scheduler'
import { RoleFitForm } from '@/features/role-fit/role-fit-form'
import { motion } from '@/lib/motion'
import { ExternalLink, linkSoundProps, quietLinkClassName } from '@/components/links'
import { PageShell } from '@/components/page-shell'
import { ProjectList } from '@/components/project-list'
import { ExperienceList } from '@/components/experience-list'
import { NoteList } from '@/components/note-list'
import { site } from '@/config/site'
import { profile, socialLinks } from '@/content/portfolio'
import { localeDetails } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { getRequestLocale } from '@/i18n/request-locale'

const homeTitle = 'henrique krause'
const homeDescription =
  'software engineer in lisbon. i like turning ideas into software and caring about how it feels to use.'

export async function generateMetadata(
  _props: PageProps<'/'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const inherited = await parent

  return {
    title: { absolute: homeTitle },
    description: homeDescription,
    openGraph: {
      ...inherited.openGraph,
      title: homeTitle,
      description: homeDescription,
    },
    twitter: {
      ...inherited.twitter,
      title: homeTitle,
      description: homeDescription,
    },
  }
}

export default async function Home() {
  const locale = await getRequestLocale()
  const dictionary = await getDictionary(locale)
  const canonicalUrl = site.url
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${canonicalUrl}/#profile-page`,
    url: canonicalUrl,
    name: homeTitle,
    description: homeDescription,
    inLanguage: localeDetails[locale].languageTag,
    mainEntity: {
      '@type': 'Person',
      '@id': `${canonicalUrl}/#person`,
      name: profile.name,
      alternateName: profile.handle,
      url: canonicalUrl,
      image: `${site.url}/icon.png`,
      jobTitle: dictionary.site.role,
      email: profile.email,
      homeLocation: {
        '@type': 'Place',
        name: dictionary.site.location,
      },
      sameAs: socialLinks.map(({ href }) => href),
    },
  }

  return (
    <PageShell
      locale={locale}
      navigation={dictionary.navigation}
      className="[&_[data-action-background]]:transition-[filter,opacity] [&_[data-action-background]]:duration-(--motion-settle) motion-reduce:[&_[data-action-background]]:transition-none [&:has([data-action-open=true])_[data-action-background]:not(:focus-within):not([data-action-open=true])]:opacity-50 [&:has([data-action-open=true])_[data-action-background]:not(:focus-within):not([data-action-open=true])]:blur-[1.5px]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <header data-action-background className="flex flex-col gap-3 lowercase">
        <h1 className="animate-journal-enter mb-1 origin-left text-2xl leading-tight font-medium tracking-tight text-black motion-reduce:animate-none dark:text-white">
          {profile.name}.
        </h1>
        {(['intro', 'process', 'interests'] as const).map((section, index) => (
          <p
            className="animate-journal-enter origin-left text-pretty motion-reduce:animate-none"
            key={section}
            style={{ animationDelay: `${(index + 1) * motion.stagger.item}ms` }}
          >
            {dictionary.home.bio[section]}
          </p>
        ))}
      </header>

      <div data-action-background>
        <ProjectList
          dictionary={dictionary.home}
          projectDictionary={dictionary.projects}
          locale={locale}
        />
      </div>
      <div data-action-background>
        <ExperienceList dictionary={dictionary.home.experience} />
      </div>
      <div>
        <NoteList dictionary={dictionary.home.notes} locale={locale} limit={3} />
      </div>

      <div
        className="animate-journal-enter flex origin-left flex-col gap-4 lowercase motion-reduce:animate-none"
        style={{ animationDelay: `${motion.stagger.footer}ms` }}
      >
        <p data-action-background className="text-pretty">
          {dictionary.home.contact.description}
        </p>
        <nav
          aria-label={dictionary.navigation.primaryLinks}
          className="flex flex-col gap-3 text-sm leading-relaxed"
        >
          <div data-action-background className="flex flex-wrap gap-x-5 gap-y-2">
            <a {...linkSoundProps} className={quietLinkClassName} href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            {socialLinks.map((link) => (
              <ExternalLink
                appearance="quiet"
                href={link.href}
                key={link.href}
                newTabLabel={dictionary.navigation.externalLinkNewTab}
              >
                {link.label}
              </ExternalLink>
            ))}
          </div>
          <div>
            <HomeActions
              closeLabel={dictionary.home.contact.close}
              actions={[
                {
                  id: 'schedule',
                  label: dictionary.home.contact.schedule,
                  content: (
                    <Fragment key="schedule">
                      <p className="mb-5 text-pretty">{dictionary.schedule.description}</p>
                      <MeetingScheduler locale={locale} dictionary={dictionary.schedule.form} />
                    </Fragment>
                  ),
                },
                {
                  id: 'fit',
                  label: dictionary.home.contact.roleFit,
                  content: (
                    <Fragment key="fit">
                      <p className="mb-5 text-pretty">{dictionary.fit.description}</p>
                      <RoleFitForm
                        closeLabel={dictionary.home.contact.close}
                        locale={locale}
                        dictionary={dictionary.fit.form}
                      />
                    </Fragment>
                  ),
                },
                {
                  id: 'guestbook',
                  label: dictionary.home.contact.guestbook,
                  content: (
                    <Guestbook key="guestbook" locale={locale} dictionary={dictionary.guestbook} />
                  ),
                },
              ]}
            />
          </div>
        </nav>
      </div>
    </PageShell>
  )
}
