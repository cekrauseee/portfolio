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
      aria-labelledby="projects-heading"
    >
      <h2
        id="projects-heading"
        className="home-enter-item mb-4 text-sm leading-relaxed font-medium text-black/60 dark:text-white/65"
        style={{ animationDelay: "110ms" }}
      >
        {dictionary.projects}
      </h2>

      <ProjectCollapsibleList
        marksProjectFocus
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

            <p className="mt-4 text-sm lowercase">
              <ExternalLink
                appearance="soft"
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
