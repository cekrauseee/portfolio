import { createNoteOgImage, noteOgImageAlt } from '@/features/notes/og-image'
import { ogImageSize } from '@/lib/og-image'

export const alt = noteOgImageAlt
export const size = ogImageSize
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return createNoteOgImage(params)
}
