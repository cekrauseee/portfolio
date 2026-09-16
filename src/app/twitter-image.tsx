import { createOgImage, ogImageAlt, ogImageSize } from '@/lib/og-image'

export const alt = ogImageAlt
export const size = ogImageSize
export const contentType = 'image/png'

export default function Image() {
  return createOgImage()
}
