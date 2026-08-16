import { textLinkClassName } from "./_components/external-link";
import { ProjectList } from "./_components/project-list";
import { SiteNavigation } from "./_components/site-navigation";
import { profile, socialLinks } from "./content";
import { site } from "./site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${site.url}/#profile-page`,
  url: site.url,
  name: site.title,
  description: site.description,
  inLanguage: site.language,
  mainEntity: {
    "@type": "Person",
    "@id": `${site.url}/#person`,
    name: profile.name,
    alternateName: profile.handle,
    url: site.url,
    image: `${site.url}/icon.png`,
    jobTitle: profile.role,
    email: profile.email,
    homeLocation: {
      "@type": "Place",
      name: profile.location,
    },
    sameAs: socialLinks.map(({ href }) => href),
  },
};

export default function Home() {
  return (
    <main className="min-h-screen min-h-svh min-h-dvh select-none pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pr-[calc(1rem+env(safe-area-inset-right))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] max-[23rem]:pl-[calc(1rem+env(safe-area-inset-left))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pr-[calc(3rem+env(safe-area-inset-right))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pl-[calc(3rem+env(safe-area-inset-left))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="flex w-full max-w-[26rem] flex-col gap-8 [@media(max-height:42rem)]:gap-6 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-4">
        <SiteNavigation />

        <header className="flex flex-col gap-1">
          <h1 className="font-medium">{profile.name}</h1>
          <p>
            {profile.role} based in {profile.location}.
          </p>
          <a
            className={textLinkClassName}
            href={`mailto:${profile.email}`}
          >
            {profile.email}
          </a>
        </header>

        <ProjectList />
      </div>
    </main>
  );
}
