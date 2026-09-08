import { getProjects } from "@/content/portfolio";
import { ExternalLink } from "@/components/links";
import { ProjectCollapsibleList } from "@/components/project-collapsible-list";
import { ProjectMarkdown } from "@/components/project-markdown";
import type { Dictionary } from "@/i18n/dictionary";
import { localeTag, type Locale } from "@/i18n/config";

export function ProjectList({
  dictionary,
  projectDictionary,
  locale,
}: {
  dictionary: Dictionary["home"];
  projectDictionary: Dictionary["projects"];
  locale: Locale;
}) {
  const projects = getProjects(locale);
  return (
    <section
      className="project-focus-anchor flex flex-col lowercase"
      aria-label={dictionary.projects}
    >
      <h2
        className="home-enter-item mb-4 w-fit text-[0.9375rem] leading-6 font-semibold text-black underline decoration-[0.08em] underline-offset-[0.18em] dark:text-white"
        style={{ animationDelay: "270ms" }}
      >
        {dictionary.projects}
      </h2>

      <ProjectCollapsibleList
        projects={projects.map((project) => ({
          slug: project.slug,
          name: project.name,
          description: project.description,
          languageTag: localeTag(project.contentLocale),
        }))}
      >
        {projects.map((project) => (
          <div key={project.slug} lang={localeTag(project.contentLocale)}>
            <ProjectMarkdown
              assetBaseUrl={project.assetBaseUrl}
              content={project.content}
            />

            <p className="mt-8 lowercase">
              <ExternalLink
                className="text-black/82 decoration-black/35 dark:text-white/84 dark:decoration-white/35"
                href={project.repositoryUrl}
                newTabLabel={projectDictionary.externalLinkNewTab}
              >
                {projectDictionary.repository}
              </ExternalLink>
            </p>
          </div>
        ))}
      </ProjectCollapsibleList>
    </section>
  );
}
