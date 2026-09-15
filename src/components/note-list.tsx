import { NoteRouteLink } from '@/components/note-route-link'
import { NoteHeading } from '@/components/note-heading'
import { getNotes } from '@/content/notes'
import { motion } from '@/lib/motion'
import type { Dictionary } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

export function NoteList({
  dictionary,
  locale,
  limit,
}: {
  dictionary: Dictionary['home']['notes']
  locale: Locale
  limit?: number
}) {
  const notes = getNotes(locale).slice(0, limit)
  if (notes.length === 0) return null
  return (
    <section aria-labelledby="notes-heading" className="lowercase">
      <h2
        id="notes-heading"
        className="animate-journal-enter mb-4 text-sm leading-relaxed font-medium text-black/60 motion-reduce:animate-none dark:text-white/65"
        style={{ animationDelay: `${motion.stagger.section}ms` }}
      >
        {dictionary.title}
      </h2>
      <div className="flex flex-col gap-5">
        {notes.map((note, index) => (
          <article
            key={note.slug}
            data-note-card={note.slug}
            className="animate-journal-enter motion-reduce:animate-none"
            style={{
              animationDelay: `${Math.min(motion.stagger.section + (index + 1) * motion.stagger.item, motion.stagger.footer)}ms`,
            }}
          >
            <NoteRouteLink slug={note.slug}>
              <NoteHeading note={note} locale={locale} />
            </NoteRouteLink>
          </article>
        ))}
      </div>
    </section>
  )
}
