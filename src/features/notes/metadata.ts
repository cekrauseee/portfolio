import type { Metadata, MetadataRoute } from 'next'
import type { LocalizedNote } from '@/content/notes'
import { site } from '@/config/site'
import { profile } from '@/content/portfolio'
import { localeDetails, localeTag } from '@/i18n/config'

export function notePath(slug: string) {
  return `/notes/${encodeURIComponent(slug)}`
}

export function noteMetadata(
  note: LocalizedNote,
  pageTitles: Readonly<Record<string, string>> = {},
): Metadata {
  const pageTitle = (pageTitles[note.id]?.trim() || note.id).toLowerCase()
  const title = `${pageTitle} · ${site.name.toLowerCase()}`
  const description = note.summary.toLowerCase()
  const pathname = notePath(note.slug)
  return {
    title,
    description,
    alternates: { canonical: pathname },
    robots:
      note.status === 'published'
        ? {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              'max-image-preview': 'large',
              'max-snippet': -1,
              'max-video-preview': -1,
            },
          }
        : { index: false, follow: false },
    openGraph: {
      type: 'article',
      url: pathname,
      title,
      description,
      siteName: site.name,
      locale: localeDetails[note.contentLocale].openGraphLocale,
      publishedTime: note.publishedAt ?? undefined,
      authors: [site.url],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: note.summary,
      creator: `@${site.xHandle}`,
    },
  }
}

export function noteStructuredData(note: LocalizedNote) {
  const url = new URL(notePath(note.slug), site.url).href
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: note.title,
    description: note.summary,
    datePublished: note.publishedAt ?? `${note.date}T00:00:00Z`,
    inLanguage: localeTag(note.contentLocale),
    author: { '@type': 'Person', '@id': `${site.url}/#person`, name: profile.name, url: site.url },
    isAccessibleForFree: true,
  }
}

export function noteSitemapEntries(notes: readonly LocalizedNote[]): MetadataRoute.Sitemap {
  return notes
    .filter((note) => note.status === 'published')
    .map((note) => ({
      url: new URL(notePath(note.slug), site.url).href,
      changeFrequency: 'monthly',
      priority: 0.7,
    }))
}
