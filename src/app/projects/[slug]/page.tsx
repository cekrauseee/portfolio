import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { site } from "@/config/site";
import { getProject, projects } from "@/content/portfolio";

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
  const project = getProject(slug);

  if (!project) {
    return {};
  }

  const path = `/projects/${project.slug}`;

  return {
    title: project.slug,
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
      keywords: project.highlights.join(", "),
      author: {
        "@id": `${site.url}/#person`,
      },
    },
  ];

  return (
    <PageShell>
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
          <p className="mt-4 text-base leading-7 text-pretty text-black/75 dark:text-white/85">
            {project.summary}
          </p>
          <p className="mt-6">
            <ExternalLink href={project.repositoryUrl}>Repository</ExternalLink>
          </p>
          <p className="mt-3 max-w-[48ch] text-sm leading-6 text-black/60 dark:text-white/70">
            {project.highlights.join(" · ")}
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-10 [@media(max-height:42rem)]:gap-8">
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
          <Link className={mutedTextLinkClassName} href="/">
            Back
          </Link>
        </footer>
      </article>
    </PageShell>
  );
}
