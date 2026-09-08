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
        <p
          className="home-enter-item mt-3 text-[0.9375rem] leading-6 tracking-[-0.015em] text-black/58 lowercase dark:text-white/64"
          style={{ animationDelay: "45ms" }}
        >
          {dictionary.site.profileSummary
            .replace("{role}", dictionary.site.role)
            .replace("{location}", dictionary.site.location)}
        </p>
        <p
          className="home-enter-item mt-4 text-[0.9375rem] leading-6 tracking-[-0.015em] text-black/58 lowercase dark:text-white/64"
          style={{ animationDelay: "90ms" }}
        >
          {dictionary.site.description}
        </p>
        <a
          {...linkSoundProps}
          className={`${textLinkClassName} home-enter-item mt-4 w-fit text-[0.9375rem] text-black/82 lowercase decoration-black/35 dark:text-white/84 dark:decoration-white/35`}
          href={`mailto:${profile.email}`}
          style={{ animationDelay: "135ms" }}
        >
          {profile.email}
        </a>
      </header>

      <div className="flex flex-col items-start gap-2 lowercase">
        <Link
          {...actionSoundProps}
          className={`${textLinkClassName} home-enter-item text-[0.9375rem] font-medium text-black dark:text-white`}
          href="/fit"
          style={{ animationDelay: "180ms" }}
        >
          {dictionary.home.assessFit}
        </Link>

        <div
          className="home-enter-item flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/48 dark:text-white/52"
          style={{ animationDelay: "225ms" }}
        >
          <Link
            {...linkSoundProps}
            className={`${textLinkClassName} decoration-black/20 dark:decoration-white/20`}
            href="/schedule"
          >
            {dictionary.home.scheduleConversation}
          </Link>

          <Link
            {...linkSoundProps}
            className={`${textLinkClassName} decoration-black/20 dark:decoration-white/20`}
            href="/guestbook"
          >
            {dictionary.home.leaveMessage}
          </Link>
        </div>
      </div>

      <ProjectList
        dictionary={dictionary.home}
        projectDictionary={dictionary.projects}
        locale={locale}
      />

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
