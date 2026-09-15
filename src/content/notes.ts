import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { Locale } from '@/i18n/config'
import { normalizeNoteForSpeech, stripAudioTagsFromMarkdown } from '@/content/notes-markdown'

export const NOTE_LOCALES = ['en', 'pt', 'ja'] as const
export type NoteLocale = (typeof NOTE_LOCALES)[number]

type ManifestLocaleEntry = {
  markdownSha256: string
  spokenTextSha256: string
  generationConfigHash: string
  markdownPath: string
  title: string
  summary: string
  audioUrl: string
  alignmentUrl: string
  durationMs: number
}

type ManifestEntry = {
  id: string
  slug: string
  status: 'published' | 'draft'
  date: string
  publishedAt: string | null
  locales: Record<NoteLocale, ManifestLocaleEntry>
}

type SnapshotLocale = ManifestLocaleEntry & {
  rawMarkdown: string
  markdownBody: string
  spokenText: string
}

type SnapshotNote = Omit<ManifestEntry, 'locales'> & {
  locales: Record<NoteLocale, SnapshotLocale>
}

export type NotesSnapshot = {
  version: 1
  source: {
    kind: 'github' | 'local' | 'local-preview' | 'empty'
    commit: string
  }
  manifest: { schemaVersion: 1; generatedAt: string; notes: ManifestEntry[] }
  notes: SnapshotNote[]
}

export type LocalizedNote = SnapshotLocale &
  Omit<SnapshotNote, 'locales'> & {
    locale: NoteLocale
    contentLocale: NoteLocale
  }

const snapshotPath = path.join(process.cwd(), '.cache', 'notes.json')
const LOCAL_ASSET_PATH_PATTERN =
  /^\/api\/notes-assets\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:en|pt|ja)\/[a-f0-9]{64}\/(?:audio\.mp3|alignment\.json)$/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeLocalAssetUrl(value: unknown): value is string {
  return typeof value === 'string' && LOCAL_ASSET_PATH_PATTERN.test(value)
}

function isSafeAssetUrl(value: unknown) {
  if (!nonEmptyString(value)) {
    return false
  }
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.hostname.endsWith('.public.blob.vercel-storage.com') &&
      url.pathname !== '/'
    )
  } catch {
    return false
  }
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
}

function isIsoTimestamp(value: unknown): value is string {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value))
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  )
}

function normalizedDate(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value
}

function normalizedTimestamp(value: unknown) {
  return value instanceof Date ? value.toISOString() : value
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)
}

function validateManifestLocale(
  value: unknown,
  context: string,
  preview = false,
): ManifestLocaleEntry {
  if (!isRecord(value)) {
    throw new Error(`${context} must be an object.`)
  }
  const stringFields = [
    'markdownSha256',
    'spokenTextSha256',
    'generationConfigHash',
    'markdownPath',
    'title',
    'summary',
  ]
  if (stringFields.some((field) => !nonEmptyString(value[field]))) {
    throw new Error(`${context} has missing fields.`)
  }
  if (!isHash(value.markdownSha256) || !isHash(value.spokenTextSha256)) {
    throw new Error(`${context} has invalid content hashes.`)
  }
  const markdownPath = value.markdownPath
  const audioUrl = value.audioUrl
  const alignmentUrl = value.alignmentUrl
  const durationMs = value.durationMs
  if (
    typeof markdownPath !== 'string' ||
    markdownPath.startsWith('/') ||
    markdownPath.includes('\\') ||
    !markdownPath.startsWith('content/notes/') ||
    markdownPath.split('/').some((part: string) => !part || part === '..')
  ) {
    throw new Error(`${context} has an unsafe Markdown path.`)
  }
  const textOnly = preview && audioUrl === '' && alignmentUrl === '' && durationMs === 0
  const localAssets = preview && isSafeLocalAssetUrl(audioUrl) && isSafeLocalAssetUrl(alignmentUrl)
  if (!textOnly) {
    if (!localAssets && (!isSafeAssetUrl(audioUrl) || !isSafeAssetUrl(alignmentUrl))) {
      throw new Error(`${context} has an untrusted public asset URL.`)
    }
    if (typeof durationMs !== 'number' || !Number.isInteger(durationMs) || durationMs <= 0) {
      throw new Error(`${context}.durationMs must be a positive integer.`)
    }
  }
  return value as ManifestLocaleEntry
}

function validateManifest(value: unknown, preview = false) {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isIsoTimestamp(value.generatedAt) ||
    !Array.isArray(value.notes)
  ) {
    throw new Error('Notes manifest has an invalid shape.')
  }
  const ids = new Set<string>()
  const slugs = new Set<string>()
  const generatedAt = value.generatedAt
  const entries = value.notes
  const notes = entries.map((entry, index) => {
    const context = `Notes manifest entry ${index}`
    if (
      !isRecord(entry) ||
      !(entry.status === 'published' || (preview && entry.status === 'draft')) ||
      !isId(entry.id) ||
      !isId(entry.slug) ||
      !isIsoDate(entry.date) ||
      !(entry.status === 'draft'
        ? entry.publishedAt === null
        : isIsoTimestamp(entry.publishedAt)) ||
      !isRecord(entry.locales)
    ) {
      throw new Error(`${context} is invalid.`)
    }
    if (ids.has(entry.id) || slugs.has(entry.slug)) {
      throw new Error(`${context} duplicates an id or slug.`)
    }
    ids.add(entry.id)
    slugs.add(entry.slug)
    const locales = {} as Record<NoteLocale, ManifestLocaleEntry>
    for (const locale of NOTE_LOCALES) {
      locales[locale] = validateManifestLocale(
        entry.locales[locale],
        `${context}.locales.${locale}`,
        preview,
      )
    }
    return {
      id: entry.id,
      slug: entry.slug,
      status: entry.status as 'published' | 'draft',
      date: entry.date,
      publishedAt: entry.publishedAt as string | null,
      locales,
    }
  })
  return { schemaVersion: 1 as const, generatedAt, notes }
}

function validateSourceLocale(
  value: unknown,
  manifestLocale: ManifestLocaleEntry,
  manifestEntry: ManifestEntry,
  locale: NoteLocale,
  context: string,
): SnapshotLocale {
  if (
    !isRecord(value) ||
    typeof value.rawMarkdown !== 'string' ||
    typeof value.markdownBody !== 'string' ||
    typeof value.spokenText !== 'string'
  ) {
    throw new Error(`${context} has invalid source text.`)
  }
  if (
    value.markdownSha256 !== manifestLocale.markdownSha256 ||
    value.spokenTextSha256 !== manifestLocale.spokenTextSha256
  ) {
    throw new Error(`${context} source hashes do not match the manifest.`)
  }
  let parsed
  try {
    parsed = matter(value.rawMarkdown)
  } catch (error) {
    throw new Error(`${context} has invalid front matter.`, { cause: error })
  }
  if (
    !isRecord(parsed.data) ||
    parsed.data.id !== manifestEntry.id ||
    parsed.data.status !== manifestEntry.status ||
    normalizedDate(parsed.data.date) !== manifestEntry.date ||
    normalizedTimestamp(parsed.data.publishedAt) !== manifestEntry.publishedAt ||
    parsed.data.locale !== locale ||
    parsed.data.title !== manifestLocale.title ||
    parsed.data.summary !== manifestLocale.summary ||
    parsed.content.trim() !== value.markdownBody
  ) {
    throw new Error(`${context} front matter or body does not match the manifest.`)
  }
  if (
    normalizeNoteForSpeech(stripAudioTagsFromMarkdown(value.markdownBody), locale) !==
    value.spokenText
  ) {
    throw new Error(`${context} spoken text does not match the Markdown source.`)
  }
  return {
    ...manifestLocale,
    rawMarkdown: value.rawMarkdown,
    markdownBody: value.markdownBody,
    spokenText: value.spokenText,
  }
}

export function parseNotesSnapshot(
  value: unknown,
  { allowPreview = process.env.NODE_ENV === 'development' } = {},
): NotesSnapshot {
  const sourceValue = isRecord(value) && isRecord(value.source) ? value.source : null
  const sourceKind = sourceValue?.kind
  const sourceCommit = sourceValue?.commit
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isRecord(value.source) ||
    !['github', 'local', 'local-preview', 'empty'].includes(sourceKind as string) ||
    !nonEmptyString(sourceCommit) ||
    !isRecord(value.manifest) ||
    !Array.isArray(value.notes)
  ) {
    throw new Error('Notes snapshot has an invalid shape.')
  }
  const source = value.source
  const snapshotNotes = value.notes
  const preview = sourceKind === 'local-preview'
  if (preview && !allowPreview) {
    throw new Error('Local notes previews are only allowed in development.')
  }
  const manifest = validateManifest(value.manifest, preview)
  if (snapshotNotes.length !== manifest.notes.length) {
    throw new Error('Notes snapshot note count does not match the manifest.')
  }
  const manifestById = new Map(manifest.notes.map((entry) => [entry.id, entry]))
  const ids = new Set<string>()
  const notes = snapshotNotes.map((note, index) => {
    if (!isRecord(note) || !isId(note.id) || !isRecord(note.locales)) {
      throw new Error(`Notes snapshot entry ${index} is invalid.`)
    }
    const entry = manifestById.get(note.id)
    if (!entry || ids.has(note.id)) {
      throw new Error(`Notes snapshot entry ${index} does not match its manifest.`)
    }
    ids.add(note.id)
    const locales = {} as Record<NoteLocale, SnapshotLocale>
    for (const locale of NOTE_LOCALES) {
      locales[locale] = validateSourceLocale(
        note.locales[locale],
        entry.locales[locale],
        entry,
        locale,
        `Notes snapshot ${entry.id}/${locale}`,
      )
    }
    return { ...entry, locales }
  })
  return {
    version: 1,
    source: {
      kind: source.kind as NotesSnapshot['source']['kind'],
      commit: sourceCommit,
    },
    manifest,
    notes,
  }
}

export function loadNotesSnapshot(filePath = snapshotPath): NotesSnapshot {
  let contents: string
  try {
    contents = readFileSync(filePath, 'utf8')
  } catch {
    return {
      version: 1,
      source: { kind: 'empty', commit: 'missing' },
      manifest: {
        schemaVersion: 1,
        generatedAt: new Date(0).toISOString(),
        notes: [],
      },
      notes: [],
    }
  }
  try {
    return parseNotesSnapshot(JSON.parse(contents))
  } catch (error) {
    throw new Error(`A valid notes snapshot is required at ${filePath}.`, {
      cause: error,
    })
  }
}

const notesSnapshot = loadNotesSnapshot()

export function getNotes(locale: Locale): LocalizedNote[] {
  return notesSnapshot.notes.map((note) => localizeNote(note, locale))
}

export function localizeNote(note: SnapshotNote, locale: Locale): LocalizedNote {
  const contentLocale = NOTE_LOCALES.includes(locale as NoteLocale) ? (locale as NoteLocale) : 'en'
  const selected = note.locales[contentLocale] ?? note.locales.en
  const { id, slug, status, date, publishedAt } = note
  return { id, slug, status, date, publishedAt, ...selected, locale: contentLocale, contentLocale }
}

export type ReadableNote = Pick<
  LocalizedNote,
  'id' | 'slug' | 'contentLocale' | 'spokenText' | 'audioUrl' | 'alignmentUrl' | 'durationMs'
>

export function readableNote(note: LocalizedNote): ReadableNote {
  const { id, slug, contentLocale, spokenText, audioUrl, alignmentUrl, durationMs } = note
  return { id, slug, contentLocale, spokenText, audioUrl, alignmentUrl, durationMs }
}

export function getNote(slug: string, locale: Locale) {
  const note = notesSnapshot.notes.find((candidate) => candidate.slug === slug)
  return note ? localizeNote(note, locale) : undefined
}
