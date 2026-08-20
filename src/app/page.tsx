import Link from "next/link";
import { actionClassName, textLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { ProjectList } from "@/components/project-list";
import { site } from "@/config/site";
import { profile, socialLinks } from "@/content/portfolio";

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
    <PageShell size="compact" disableTextSelection>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="flex flex-col gap-1">
        <h1 className="font-medium">{profile.name}</h1>
        <p>
          {profile.role} based in {profile.location}.
        </p>
        <a className={textLinkClassName} href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
      </header>

      <div className="flex flex-col items-start gap-3">
        <Link className={actionClassName} href="/fit">
          Assess my fit
        </Link>

        <Link className={textLinkClassName} href="/guestbook">
          Leave a message on the globe
        </Link>

        <Link className={textLinkClassName} href="/schedule">
          Schedule a conversation
        </Link>
      </div>

      <ProjectList />
    </PageShell>
  );
}
