import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  linkFocusClassName,
} from "../../_components/external-link";
import { SiteNavigation } from "../../_components/site-navigation";
import { getProject, projectDetails } from "../../content";
import { site } from "../../site";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return projectDetails.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return {};
  }

  const path = `/projects/${project.slug}`;

  return {
    title: project.name,
    description: project.metaDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      title: project.name,
      description: project.metaDescription,
      siteName: site.name,
      locale: site.locale,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: `${project.name} project notes`,
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
          alt: `${project.name} project notes`,
        },
      ],
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  const projectUrl = `${site.url}/projects/${project.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Portfolio",
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
      keywords: project.technologies.join(", "),
      author: {
        "@id": `${site.url}/#person`,
      },
    },
  ];

  return (
    <main className="min-h-screen min-h-svh min-h-dvh pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] max-[23rem]:pt-[calc(1rem+env(safe-area-inset-top))] max-[23rem]:pr-[calc(1rem+env(safe-area-inset-right))] max-[23rem]:pb-[calc(1rem+env(safe-area-inset-bottom))] max-[23rem]:pl-[calc(1rem+env(safe-area-inset-left))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pt-[calc(3rem+env(safe-area-inset-top))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pr-[calc(3rem+env(safe-area-inset-right))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pb-[calc(3rem+env(safe-area-inset-bottom))] [@media(min-width:48rem)_and_(min-height:42.01rem)]:pl-[calc(3rem+env(safe-area-inset-left))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="flex w-full max-w-[42rem] flex-col gap-10 [@media(max-height:42rem)]:gap-7">
        <SiteNavigation />

        <nav
          className="flex flex-wrap gap-x-2 text-black/55 dark:text-white/65"
          aria-label="Breadcrumb"
        >
          <Link className={linkFocusClassName} href="/">
            portfolio
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{project.slug}</span>
        </nav>

        <article className="max-w-[65ch]">
          <header>
            <p className="text-black/55 dark:text-white/65">Project notes</p>
            <h1 className="mt-2 text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
              {project.name}
            </h1>
            <p className="mt-5 text-base leading-7 text-pretty text-black/75 dark:text-white/85">
              {project.summary}
            </p>

            <dl className="mt-8 flex flex-col gap-5 border-y border-black/10 py-6 dark:border-white/15">
              <div>
                <dt className="text-black/55 dark:text-white/65">Technology</dt>
                <dd className="mt-1 leading-6">
                  {project.technologies.join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-black/55 dark:text-white/65">Source</dt>
                <dd className="mt-1">
                  <ExternalLink href={project.repositoryUrl}>
                    View the {project.name} repository
                  </ExternalLink>
                </dd>
              </div>
            </dl>
          </header>

          <div className="mt-10 flex flex-col gap-10 [@media(max-height:42rem)]:gap-8">
            {project.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg leading-7 font-medium">
                  {section.title}
                </h2>
                <div className="mt-3 flex flex-col gap-4 text-base leading-7 text-black/75 dark:text-white/85">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <Link
          className="w-fit text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground dark:text-white/75 dark:decoration-white/30 dark:hover:text-white"
          href="/"
        >
          Back to portfolio
        </Link>
      </div>
    </main>
  );
}
