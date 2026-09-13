import type { MetadataRoute } from 'next'
import { getNotes } from '@/content/notes'
import { noteSitemapEntries } from '@/features/notes/metadata'
import { site } from '@/config/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...noteSitemapEntries(getNotes('en')),
    {
      url: site.url,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
