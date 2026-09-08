import { ExternalLink } from "@/components/links";
import { ProjectCollapsibleList } from "@/components/project-collapsible-list";
import { experience } from "@/content/portfolio";
import type { Dictionary } from "@/i18n/dictionary";

export function ExperienceList({
  dictionary,
  externalLinkNewTab,
}: {
  dictionary: Dictionary["home"]["experience"];
  externalLinkNewTab: string;
}) {
  return (
    <section className="flex flex-col lowercase">
      <h2 className="home-enter-item mb-5 w-fit text-[0.9375rem] leading-6 font-semibold text-black underline decoration-[0.08em] underline-offset-[0.18em] dark:text-white">
        {dictionary.title}
      </h2>

      <ProjectCollapsibleList
        idPrefix="experience"
        projects={experience.map((entry) => ({
          slug: entry.id,
          name: entry.company,
          description: dictionary.entries[entry.id].roleAndPeriod,
        }))}
      >
        {experience.map((entry) => {
          const paragraphs =
            entry.id === "teamIt"
              ? [
                  dictionary.entries.teamIt.paragraphs.first,
                  dictionary.entries.teamIt.paragraphs.second,
                ]
              : entry.id === "clinia"
                ? [
                    dictionary.entries.clinia.paragraphs.first,
                    dictionary.entries.clinia.paragraphs.second,
                  ]
                : [dictionary.entries.killing.paragraph];

          return (
            <div className="pt-3" key={entry.id}>
              {paragraphs.map((paragraph) => (
                <p
                  className="mb-3 text-black/58 last:mb-0 dark:text-white/64"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          );
        })}
      </ProjectCollapsibleList>

      <ExternalLink
        className="home-enter-item mt-5 w-fit text-black/82 decoration-black/35 dark:text-white/84 dark:decoration-white/35"
        href="https://www.linkedin.com/in/cekrauseee"
        newTabLabel={externalLinkNewTab}
      >
        {dictionary.linkedin}
      </ExternalLink>
    </section>
  );
}
