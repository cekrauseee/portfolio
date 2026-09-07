import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  linkSoundProps,
  mutedTextLinkClassName,
} from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { site } from "@/config/site";
import { getProject, projects } from "@/content/portfolio";
import { localeTag } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";
import { requestMetadata } from "@/i18n/metadata";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const project = getProject(slug, locale);

  if (!project) {
    return {};
  }

  const dictionary = await getDictionary(locale);
  const metadata = requestMetadata(
    project.contentLocale,
    `/projects/${project.slug}`,
    project.slug,
    project.metaDescription,
    project.name,
  );

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: dictionary.projects.projectNotesAlt.replace(
            "{name}",
            project.name,
          ),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description: project.metaDescription,
      creator: `@${site.xHandle}`,
      images: [
        {
          url: "/twitter-image.png",
          width: 1200,
          height: 630,
          alt: dictionary.projects.projectNotesAlt.replace(
            "{name}",
            project.name,
          ),
        },
      ],
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const project = getProject(slug, locale);

  if (!project) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const projectUrl = `${site.url}/projects/${project.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: dictionary.projects.portfolio,
          item: site.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: project.name,
          item: projectUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "@id": `${projectUrl}#project`,
      name: project.name,
      description: project.metaDescription,
      url: projectUrl,
      codeRepository: project.repositoryUrl,
      keywords: project.highlights.join(", "),
      author: {
        "@id": `${site.url}/#person`,
      },
      inLanguage: localeTag(project.contentLocale),
    },
  ];

  return (
    <PageShell locale={locale} navigation={dictionary.navigation}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <article className="max-w-[65ch]">
        <header>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
            {project.name}
          </h1>
          <p
            className="mt-4 text-base leading-7 text-pretty text-black/75 dark:text-white/85"
            lang={localeTag(project.contentLocale)}
          >
            {project.summary}
          </p>
          <p className="mt-6">
            <ExternalLink
              href={project.repositoryUrl}
              newTabLabel={dictionary.projects.externalLinkNewTab}
            >
              {dictionary.projects.repository}
            </ExternalLink>
          </p>
          <p
            className="mt-3 max-w-[48ch] text-sm leading-6 text-black/60 dark:text-white/70"
            lang={localeTag(project.contentLocale)}
          >
            {project.highlights.join(" · ")}
          </p>
        </header>

        <div
          className="mt-10 flex flex-col gap-10 [@media(max-height:42rem)]:gap-8"
          lang={localeTag(project.contentLocale)}
        >
          {project.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg leading-7 font-medium">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-4 text-base leading-7 text-black/75 dark:text-white/85">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 [@media(max-height:42rem)]:mt-9">
          <Link {...linkSoundProps} className={mutedTextLinkClassName} href="/">
            {dictionary.projects.back}
          </Link>
        </footer>
      </article>
    </PageShell>
  );
}
