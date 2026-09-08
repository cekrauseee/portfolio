import Link from "next/link";
import { Inter } from "next/font/google";
import {
  ExternalLink,
  linkSoundProps,
  quietLinkClassName,
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
      containerClassName={`${inter.className} home-project-focus mx-auto flex w-full max-w-xl flex-col gap-10 px-4 text-[0.9375rem] leading-relaxed font-normal text-black/65 select-text sm:gap-12 dark:text-white/70 [&_footer_button]:rounded-full [&_footer_button]:px-2 [&_footer_button]:text-[0.8125rem] [&_footer_button]:leading-5 [&_footer_button]:lowercase [&_footer_button]:no-underline [&_footer_button]:transition-[background-color,color,scale] [&_footer_button]:duration-200 [&_footer_button]:ease-out [&_footer_button:hover]:bg-black/[0.05] [&_footer_button:focus-visible]:bg-black/[0.05] motion-safe:[&_footer_button:active]:scale-[0.97] motion-reduce:[&_footer_button]:transition-none dark:[&_footer_button:hover]:bg-white/[0.08] dark:[&_footer_button:focus-visible]:bg-white/[0.08] [&_footer_button[aria-pressed=true]]:bg-black/[0.05] [&_footer_button[aria-pressed=true]]:font-medium dark:[&_footer_button[aria-pressed=true]]:bg-white/[0.08]`}
      showNavigation={false}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="flex flex-col gap-3 lowercase">
        <h1 className="home-enter-item mb-1 text-2xl leading-tight font-medium tracking-tight text-black dark:text-white">
          {profile.name}.
        </h1>
        {[
          dictionary.home.bio.intro,
          dictionary.home.bio.process,
          dictionary.home.bio.interests,
        ].map((paragraph, index) => (
          <p
            className="home-enter-item text-pretty"
            key={paragraph}
            style={{ animationDelay: `${30 + index * 30}ms` }}
          >
            {paragraph}
          </p>
        ))}
      </header>

      <ProjectList
        dictionary={dictionary.home}
        projectDictionary={dictionary.projects}
        locale={locale}
      />

      <ExperienceList dictionary={dictionary.home.experience} />

      <div
        className="home-enter-item flex flex-col gap-4 lowercase"
        style={{ animationDelay: "290ms" }}
      >
        <p className="text-pretty">{dictionary.home.contact.description}</p>
        <nav
          aria-label={dictionary.navigation.primaryLinks}
          className="flex flex-col gap-3 text-sm leading-relaxed"
        >
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a
              {...linkSoundProps}
              className={quietLinkClassName}
              href={`mailto:${profile.email}`}
            >
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
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              {...linkSoundProps}
              className={quietLinkClassName}
              href="/schedule"
            >
              {dictionary.home.contact.schedule}
            </Link>
            <Link
              {...linkSoundProps}
              className={quietLinkClassName}
              href="/fit"
            >
              {dictionary.home.contact.roleFit}
            </Link>
            <Link
              {...linkSoundProps}
              className={quietLinkClassName}
              href="/guestbook"
            >
              {dictionary.home.guestbook.title}
            </Link>
          </div>
        </nav>
      </div>
    </PageShell>
  );
}
