import { ProjectCollapsibleList } from '@/components/project-collapsible-list'
import { experience } from '@/content/portfolio'
import { motion } from '@/lib/motion'
import type { Dictionary } from '@/i18n/dictionary'

export function ExperienceList({ dictionary }: { dictionary: Dictionary['home']['experience'] }) {
  return (
    <section className="flex flex-col lowercase" aria-labelledby="experience-heading">
      <h2
        id="experience-heading"
        style={{ animationDelay: `${motion.stagger.section}ms` }}
        className="animate-journal-enter mb-4 origin-left text-sm leading-relaxed font-medium text-black/60 motion-reduce:animate-none dark:text-white/65"
      >
        {dictionary.title}
      </h2>
      <ProjectCollapsibleList
        idPrefix="experience"
        projects={experience.map((entry) => ({
          slug: entry.id,
          name: entry.company,
          description: dictionary.entries[entry.id].role,
          meta: dictionary.entries[entry.id].period,
        }))}
      >
        {experience.map((entry) => (
          <p className="pt-4 text-pretty" key={entry.id}>
            {dictionary.entries[entry.id].description}
          </p>
        ))}
      </ProjectCollapsibleList>
    </section>
  )
}
