import { notFound } from 'next/navigation'
import { getNote } from '@/content/notes'
import { createOgImage } from '@/lib/og-image'

export const noteOgImageAlt = 'A note from henrique krause'

export async function createNoteOgImage(params: Promise<{ slug: string }>) {
  const { slug } = await params
  const note = getNote(slug, 'en')

  if (!note || (note.status !== 'published' && process.env.NODE_ENV !== 'development')) {
    notFound()
  }

  return createOgImage({
    title: note.title,
    subtitle: `/notes/${note.slug}`,
  })
}
