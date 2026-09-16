import { notFound } from 'next/navigation'
import { getNote } from '@/content/notes'
import { site } from '@/config/site'
import { createOgImage } from '@/lib/og-image'

export const noteOgImageAlt = 'a note by henrique krause'

export async function createNoteOgImage(params: Promise<{ slug: string }>) {
  const { slug } = await params
  const note = getNote(slug, 'en')

  if (!note || (note.status !== 'published' && process.env.NODE_ENV !== 'development')) {
    notFound()
  }

  return createOgImage({
    title: note.title.toLowerCase(),
    subtitle: `by ${site.name.toLowerCase()}`,
  })
}
