import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getNote, readableNote } from '@/content/notes'
import { noteMetadata, noteStructuredData } from '@/features/notes/metadata'
import { NoteHeading } from '@/components/note-heading'
import { NotePageReader } from '@/components/note-page-reader'
import { NotePageEntrance } from '@/components/note-page-entrance'
import { NoteMarkdownContent } from '@/components/note-markdown-content'
import { LocaleTransition } from '@/components/locale-transition'
import { getRequestLocale } from '@/i18n/request-locale'
import { getDictionary } from '@/i18n/get-dictionary'
import { localeTag } from '@/i18n/config'

// Resolve the slug and the visitor's locale for each request; no per-note page files.
export const dynamic = 'force-dynamic'

const resolveNote = cache(async (slug: string) => {
  const locale = await getRequestLocale()
  const note = getNote(slug, locale)
  if (!note || (note.status !== 'published' && process.env.NODE_ENV !== 'development')) notFound()
  return { note, locale }
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { note, locale } = await resolveNote((await params).slug)
  const dictionary = await getDictionary(locale)
  return noteMetadata(note, dictionary.home.notes.pageTitles)
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { note, locale } = await resolveNote((await params).slug)
  const dictionary = await getDictionary(locale)
  return (
    <NotePageEntrance>
      <LocaleTransition
        locale={locale}
        className={`portfolio-content mx-auto w-full max-w-xl px-8 pt-[calc(clamp(1.5rem,5svh,3rem)+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[0.9375rem] leading-relaxed font-normal text-black/65 dark:text-white/70`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(noteStructuredData(note)).replace(/</g, '\\u003c'),
          }}
        />
        <article
          data-note-card={note.slug}
          data-note-reading="true"
          lang={localeTag(note.contentLocale)}
          className="lowercase select-text"
        >
          <NoteHeading note={note} locale={locale} detail />
          <div className="pt-7">
            <NotePageReader
              note={readableNote(note)}
              dictionary={dictionary.notes}
              navigation={dictionary.navigation}
            >
              <NoteMarkdownContent
                content={note.markdownBody}
                spokenText={note.spokenText}
                locale={note.contentLocale}
              />
            </NotePageReader>
          </div>
        </article>
      </LocaleTransition>
    </NotePageEntrance>
  )
}
