import type { LocalizedNote } from '@/content/notes'
import { localeTag, type Locale } from '@/i18n/config'

export function NoteHeading({
  note,
  locale,
  detail = false,
}: {
  note: Pick<LocalizedNote, 'slug' | 'title' | 'summary' | 'date' | 'contentLocale'>
  locale: Locale
  detail?: boolean
}) {
  const Title = detail ? 'h1' : 'h3'
  const date = new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${note.date}T00:00:00Z`))
  return (
    <header data-note-header className="lowercase" lang={localeTag(note.contentLocale)}>
      <Title
        data-note-shared="title"
        className="text-base leading-relaxed font-medium text-black lowercase dark:text-white"
      >
        {note.title}
      </Title>

      <p
        data-note-shared="summary"
        className={`max-w-[52ch] text-sm leading-relaxed font-normal text-black/60 lowercase dark:text-white/65 ${detail ? 'mt-2' : 'mt-1'}`}
      >
        {note.summary}
      </p>

      <p
        data-note-shared="date"
        className={`text-xs leading-relaxed font-normal text-black/45 lowercase dark:text-white/55 ${detail ? 'mt-3' : 'mt-1'}`}
      >
        <time dateTime={note.date}>{date}</time>
      </p>
    </header>
  )
}
