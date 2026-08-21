import Link from "next/link";
import { actionClassName, textLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { ProjectList } from "@/components/project-list";
import { site } from "@/config/site";
import { profile, socialLinks } from "@/content/portfolio";
import { localeDetails } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";

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
      size="compact"
      disableTextSelection
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="flex flex-col gap-1">
        <h1 className="font-medium">{profile.name}</h1>
        <p>
          {dictionary.site.profileSummary
            .replace("{role}", dictionary.site.role)
            .replace("{location}", dictionary.site.location)}
        </p>
        <a className={textLinkClassName} href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
      </header>

      <div className="flex flex-col items-start gap-3">
        <Link className={actionClassName} href="/fit">
          {dictionary.home.assessFit}
        </Link>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link className={textLinkClassName} href="/schedule">
            {dictionary.home.scheduleConversation}
          </Link>

          <Link className={textLinkClassName} href="/guestbook">
            {dictionary.home.leaveMessage}
          </Link>
        </div>
      </div>

      <ProjectList dictionary={dictionary.home} locale={locale} />
    </PageShell>
  );
}
