import { ImageResponse } from 'next/og'
import { site } from '@/config/site'

export const ogImageSize = {
  width: 1200,
  height: 630,
} as const

export const ogImageAlt = `${site.name.toLowerCase()} — software engineer in lisbon`

export type OgImageContent = Readonly<{
  title: string
  subtitle: string
}>

const defaultOgImageContent: OgImageContent = {
  title: site.name.toLowerCase(),
  subtitle: 'software engineer in lisbon',
}

export function createOgImage(content: OgImageContent = defaultOgImageContent) {
  return new ImageResponse(
    <div
      style={{
        backgroundColor: '#f2f2f0',
        color: '#181818',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'geist',
        height: '100%',
        justifyContent: 'center',
        padding: '60px 96px 0',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            fontSize: 74,
            fontWeight: 400,
            letterSpacing: '-2.2px',
            lineHeight: 1.05,
          }}
        >
          {content.title}
        </div>
        <div
          style={{
            color: '#70706e',
            fontSize: 31,
            fontWeight: 400,
            letterSpacing: '-0.1px',
            lineHeight: 1.15,
          }}
        >
          {content.subtitle}
        </div>
      </div>
    </div>,
    ogImageSize,
  )
}
