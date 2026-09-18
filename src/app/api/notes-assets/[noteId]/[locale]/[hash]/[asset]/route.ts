import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

const NOTE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const LOCALES = new Set(['en', 'fr', 'es', 'pt', 'ja'])
const HASH_PATTERN = /^[a-f0-9]{64}$/u
const ASSETS = {
  'audio.mp3': 'audio/mpeg',
  'alignment.json': 'application/json',
} as const

type AssetName = keyof typeof ASSETS

function isAssetName(value: string): value is AssetName {
  return value in ASSETS
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      noteId: string
      locale: string
      hash: string
      asset: string
    }>
  },
) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 })
  }

  const { noteId, locale, hash, asset } = await params
  if (
    !NOTE_ID_PATTERN.test(noteId) ||
    !LOCALES.has(locale) ||
    !HASH_PATTERN.test(hash) ||
    !isAssetName(asset)
  ) {
    return new Response('Not found', { status: 404 })
  }

  const notesPath = path.resolve(
    process.env.NOTES_LOCAL_PATH?.trim() || path.resolve(process.cwd(), '..', 'notes'),
  )
  const filePath = path.join(notesPath, '.notes', 'generated', noteId, locale, hash, asset)

  try {
    const contents = await readFile(filePath)
    return new Response(contents, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': ASSETS[asset],
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
