import Link from "next/link";
import { Inter } from "next/font/google";
import {
  actionSoundProps,
  ExternalLink,
  linkSoundProps,
  textLinkClassName,
} from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { ProjectList } from "@/components/project-list";
import { ExperienceList } from "@/components/experience-list";
import { site } from "@/config/site";
import { profile, socialLinks } from "@/content/portfolio";
import { localeDetails } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default async function Home() {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  const canonicalUrl = site.url;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${canonicalUrl}/#profile-page`,
    url: canonicalUrl,
    name: site.title,
    description: dictionary.site.description,
    inLanguage: localeDetails[locale].languageTag,
    mainEntity: {
      "@type": "Person",
      "@id": `${canonicalUrl}/#person`,
      name: profile.name,
      alternateName: profile.handle,
      url: canonicalUrl,
      image: `${site.url}/icon.png`,
      jobTitle: dictionary.site.role,
      email: profile.email,
      homeLocation: {
        "@type": "Place",
        name: dictionary.site.location,
      },
      sameAs: socialLinks.map(({ href }) => href),
    },
  };

  return (
    <PageShell
      locale={locale}
      navigation={dictionary.navigation}
      disableTextSelection
      containerClassName={`${inter.className} home-project-focus mx-auto flex w-full max-w-xl flex-col gap-12 px-4 text-[0.9375rem] leading-6 font-medium`}
      showNavigation={false}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="flex flex-col">
        <h1 className="home-enter-item text-2xl leading-[1.08] font-semibold tracking-[-0.04em] text-black lowercase dark:text-white">
          {profile.name}.
        </h1>
        {[
          dictionary.home.bio.intro,
          dictionary.home.bio.process,
          dictionary.home.bio.interests,
        ].map((paragraph, index) => (
          <p
            className="home-enter-item mt-4 text-[0.9375rem] leading-6 tracking-[-0.015em] text-black/58 lowercase dark:text-white/64"
            key={paragraph}
            style={{ animationDelay: `${45 + index * 45}ms` }}
          >
            {paragraph}
          </p>
        ))}
        <a
          {...linkSoundProps}
          className={`${textLinkClassName} home-enter-item mt-4 w-fit text-[0.9375rem] text-black/82 lowercase decoration-black/35 dark:text-white/84 dark:decoration-white/35`}
          href={`mailto:${profile.email}`}
          style={{ animationDelay: "180ms" }}
        >
          {profile.email}
        </a>
      </header>

      <ProjectList
        dictionary={dictionary.home}
        projectDictionary={dictionary.projects}
        locale={locale}
      />

      <ExperienceList
        dictionary={dictionary.home.experience}
        externalLinkNewTab={dictionary.navigation.externalLinkNewTab}
      />

      <section className="flex flex-col lowercase">
        <h2 className="home-enter-item mb-4 w-fit text-[0.9375rem] leading-6 font-semibold text-black underline decoration-[0.08em] underline-offset-[0.18em] dark:text-white">
          {dictionary.home.contact.title}
        </h2>
        <p className="home-enter-item text-black/58 dark:text-white/64">
          {dictionary.home.contact.description}
        </p>
        <div className="home-enter-item mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <a
            {...linkSoundProps}
            className={`${textLinkClassName} text-black/82 decoration-black/35 dark:text-white/84 dark:decoration-white/35`}
            href={`mailto:${profile.email}`}
          >
            {dictionary.home.contact.email}
          </a>
          <Link
            {...linkSoundProps}
            className={`${textLinkClassName} text-black/82 decoration-black/35 dark:text-white/84 dark:decoration-white/35`}
            href="/schedule"
          >
            {dictionary.home.scheduleConversation}
          </Link>
        </div>
        <p className="home-enter-item mt-5 text-black/58 dark:text-white/64">
          {dictionary.home.contact.roleFitDescription}
        </p>
        <Link
          {...actionSoundProps}
          className={`${textLinkClassName} home-enter-item mt-3 w-fit text-[0.9375rem] font-medium text-black dark:text-white`}
          href="/fit"
        >
          {dictionary.home.contact.roleFit}
        </Link>
      </section>

      <section className="flex flex-col lowercase">
        <h2 className="home-enter-item mb-4 w-fit text-[0.9375rem] leading-6 font-semibold text-black underline decoration-[0.08em] underline-offset-[0.18em] dark:text-white">
          {dictionary.home.guestbook.title}
        </h2>
        <p className="home-enter-item text-black/58 dark:text-white/64">
          {dictionary.home.guestbook.description}
        </p>
        <Link
          {...linkSoundProps}
          className={`${textLinkClassName} home-enter-item mt-3 w-fit text-black/82 decoration-black/35 dark:text-white/84 dark:decoration-white/35`}
          href="/guestbook"
        >
          {dictionary.home.guestbook.visit}
        </Link>
      </section>

      <nav
        aria-label={dictionary.navigation.primaryLinks}
        className="home-enter-item flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/45 lowercase dark:text-white/50"
        style={{ animationDelay: "540ms" }}
      >
        {socialLinks.map((link) => (
          <ExternalLink
            className="decoration-black/20 dark:decoration-white/20"
            href={link.href}
            key={link.href}
            newTabLabel={dictionary.navigation.externalLinkNewTab}
          >
            {link.label}
          </ExternalLink>
        ))}
      </nav>
    </PageShell>
  );
}
