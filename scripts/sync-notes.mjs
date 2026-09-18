import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import nextEnv from '@next/env'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'

const { loadEnvConfig } = nextEnv

export const NOTES_SCHEMA_VERSION = 1
export const DEFAULT_NOTES_OUTPUT_PATH = path.join(process.cwd(), '.cache', 'notes.json')
export const DEFAULT_NOTES_LOCAL_PATH = path.resolve(process.cwd(), '..', 'notes')
export const DEFAULT_NOTES_REF = 'main'
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000
const NOTE_LOCALES = ['en', 'fr', 'es', 'pt', 'ja']
const LOCAL_ASSET_PATH_PATTERN =
  /^\/api\/notes-assets\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:en|fr|es|pt|ja)\/[a-f0-9]{64}\/(?:audio\.mp3|alignment\.json)$/u
const AUDIO_TAGS = [
  'calm, conversational',
  'calm, measured',
  'calm, reflective',
  'thoughtful',
  'hopeful',
  'short pause',
  'reflective',
  'explaining',
  'slight emphasis',
  'slightly faster',
  'measured',
  'warmly',
  'slightly weary',
  'subdued',
  'gently',
  'slightly relieved',
  'gently hopeful',
]
const escapeRegex = (value) => value.replace(/[\\^$*+?.()|[\]{}]/gu, '\\$&')
const AUDIO_TAG_PATTERN = new RegExp(
  '\\[(?:' + AUDIO_TAGS.map((tag) => escapeRegex(tag)).join('|') + ')\\](?:[ \\t])?',
  'gu',
)

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeLocalAssetUrl(value) {
  return typeof value === 'string' && LOCAL_ASSET_PATH_PATTERN.test(value)
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function assertHash(value, context) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${context} must be a SHA-256 hex digest.`)
  }
}

function assertDate(value, context) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  ) {
    throw new Error(`${context} must be an ISO date.`)
  }
}

function assertTimestamp(value, context) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${context} must be an ISO timestamp.`)
  }
}

function normalizedDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value
}

function normalizedTimestamp(value) {
  return value instanceof Date ? value.toISOString() : value
}

function assertId(value, context) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) {
    throw new Error(`${context} must be a lowercase stable id.`)
  }
}

function assertMarkdownPath(value, context) {
  if (
    typeof value !== 'string' ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').some((part) => part === '..' || part === '') ||
    !value.startsWith('content/notes/') ||
    !value.endsWith('.md')
  ) {
    throw new Error(`${context} must be a safe content/notes Markdown path.`)
  }
}

function assertPublicAssetUrl(value, context) {
  if (typeof value !== 'string') {
    throw new Error(`${context} must be a public HTTPS URL.`)
  }
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${context} must be a public HTTPS URL.`)
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !url.hostname.endsWith('.public.blob.vercel-storage.com') ||
    url.pathname === '/'
  ) {
    throw new Error(`${context} must use a trusted public Vercel Blob URL.`)
  }
}

function validateManifest(value, preview = false) {
  if (
    !isRecord(value) ||
    value.schemaVersion !== NOTES_SCHEMA_VERSION ||
    !nonEmptyString(value.generatedAt) ||
    !Array.isArray(value.notes)
  ) {
    throw new Error('Notes manifest must have schemaVersion 1, generatedAt, and notes.')
  }
  assertTimestamp(value.generatedAt, 'Notes manifest.generatedAt')
  const ids = new Set()
  const notes = value.notes.map((entry, index) => {
    const context = `Notes manifest entry ${index}`
    if (
      !isRecord(entry) ||
      !(entry.status === 'published' || (preview && entry.status === 'draft')) ||
      !isRecord(entry.locales)
    ) {
      throw new Error(`${context} must be a published note with locales.`)
    }
    for (const field of ['id', 'slug', 'date']) {
      if (!nonEmptyString(entry[field]))
        throw new Error(`${context}.${field} must be a non-empty string.`)
    }
    assertId(entry.id, `${context}.id`)
    assertId(entry.slug, `${context}.slug`)
    assertDate(entry.date, `${context}.date`)
    if (entry.status === 'draft') {
      if (entry.publishedAt !== null)
        throw new Error(`${context} draft must have publishedAt null.`)
    } else assertTimestamp(entry.publishedAt, `${context}.publishedAt`)
    if (ids.has(entry.id) || ids.has(`slug:${entry.slug}`)) {
      throw new Error(`Notes manifest contains a duplicate id or slug: ${entry.id}.`)
    }
    ids.add(entry.id)
    ids.add(`slug:${entry.slug}`)
    const locales = {}
    for (const locale of NOTE_LOCALES) {
      const localeEntry = entry.locales[locale]
      const localeContext = `${context}.locales.${locale}`
      // A local working tree may still have a pre-fr/es publication manifest.
      // The source files remain authoritative for the preview; production
      // manifests must contain every first-class note locale.
      if (!isRecord(localeEntry)) {
        if (preview) continue
        throw new Error(`${localeContext} must be an object.`)
      }
      for (const field of [
        'markdownSha256',
        'spokenTextSha256',
        'generationConfigHash',
        'markdownPath',
        'title',
        'summary',
      ]) {
        if (!nonEmptyString(localeEntry[field])) {
          throw new Error(`${localeContext}.${field} must be a non-empty string.`)
        }
      }
      assertHash(localeEntry.markdownSha256, `${localeContext}.markdownSha256`)
      assertHash(localeEntry.spokenTextSha256, `${localeContext}.spokenTextSha256`)
      assertMarkdownPath(localeEntry.markdownPath, `${localeContext}.markdownPath`)
      const textOnly =
        preview &&
        localeEntry.audioUrl === '' &&
        localeEntry.alignmentUrl === '' &&
        localeEntry.durationMs === 0
      const localAssets =
        preview &&
        isSafeLocalAssetUrl(localeEntry.audioUrl) &&
        isSafeLocalAssetUrl(localeEntry.alignmentUrl)
      if (!textOnly && !localAssets) {
        assertPublicAssetUrl(localeEntry.audioUrl, `${localeContext}.audioUrl`)
        assertPublicAssetUrl(localeEntry.alignmentUrl, `${localeContext}.alignmentUrl`)
        if (!Number.isInteger(localeEntry.durationMs) || localeEntry.durationMs <= 0) {
          throw new Error(`${localeContext}.durationMs must be a positive integer.`)
        }
      }
      locales[locale] = {
        markdownSha256: localeEntry.markdownSha256,
        spokenTextSha256: localeEntry.spokenTextSha256,
        generationConfigHash: localeEntry.generationConfigHash,
        markdownPath: localeEntry.markdownPath,
        title: localeEntry.title,
        summary: localeEntry.summary,
        audioUrl: localeEntry.audioUrl,
        alignmentUrl: localeEntry.alignmentUrl,
        durationMs: localeEntry.durationMs,
      }
    }
    return {
      id: entry.id,
      slug: entry.slug,
      status: entry.status,
      date: entry.date,
      publishedAt: entry.publishedAt,
      locales,
    }
  })
  return {
    schemaVersion: NOTES_SCHEMA_VERSION,
    generatedAt: value.generatedAt,
    notes,
  }
}

function renderMarkdownNode(node) {
  if (!node || typeof node !== 'object') return ''
  const children = Array.isArray(node.children)
    ? node.children.map(renderMarkdownNode).join('')
    : ''
  switch (node.type) {
    case 'root':
      return node.children.map(renderMarkdownNode).join('\n\n')
    case 'blockquote':
    case 'list':
    case 'listItem':
    case 'footnoteDefinition':
      return node.children.map(renderMarkdownNode).join('\n\n')
    case 'paragraph':
    case 'heading':
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'link':
    case 'linkReference':
    case 'footnote':
      return children
    case 'text':
    case 'inlineCode':
    case 'code':
      return typeof node.value === 'string' ? node.value : ''
    case 'image':
    case 'imageReference':
      return typeof node.alt === 'string' ? node.alt : ''
    case 'break':
      return '\n'
    case 'thematicBreak':
    case 'definition':
      return ''
    case 'html':
      throw new Error('Markdown narration does not support raw HTML.')
    default:
      return children
  }
}

function collectAudioTagRanges(node, ranges) {
  if (node?.type === 'text' && typeof node.value === 'string') {
    const baseOffset = node.position?.start?.offset
    if (baseOffset !== undefined) {
      for (const match of node.value.matchAll(AUDIO_TAG_PATTERN)) {
        const start = baseOffset + (match.index ?? 0)
        ranges.push({ start, end: start + match[0].length })
      }
    }
  }
  if (Array.isArray(node?.children)) {
    for (const child of node.children) collectAudioTagRanges(child, ranges)
  }
}

function stripAudioTagsFromMarkdown(markdown) {
  const tree = unified().use(remarkParse).parse(markdown)
  const ranges = []
  collectAudioTagRanges(tree, ranges)
  let result = markdown
  for (const range of ranges.sort((left, right) => right.start - left.start)) {
    result = result.slice(0, range.start) + result.slice(range.end)
  }
  return result
}

function normalizeForSpeech(markdown, locale) {
  const tree = unified().use(remarkParse).parse(markdown)
  const text = renderMarkdownNode(tree)
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
  if (!text) throw new Error(`Markdown for ${locale} has no narratable text.`)
  return text
}

function parseAndValidateSource(rawMarkdown, entry, locale) {
  const sourcePath = entry.locales[locale].markdownPath
  const context = `${entry.id}/${locale} (${sourcePath})`
  if (sha256(rawMarkdown) !== entry.locales[locale].markdownSha256) {
    throw new Error(`${context} Markdown hash does not match the published manifest.`)
  }
  let parsed
  try {
    parsed = matter(rawMarkdown)
  } catch (error) {
    throw new Error(`${context} has invalid front matter.`, { cause: error })
  }
  const data = parsed.data
  if (
    !isRecord(data) ||
    data.id !== entry.id ||
    data.status !== entry.status ||
    normalizedDate(data.date) !== entry.date ||
    normalizedTimestamp(data.publishedAt) !== entry.publishedAt ||
    data.locale !== locale ||
    data.title !== entry.locales[locale].title ||
    data.summary !== entry.locales[locale].summary ||
    !nonEmptyString(parsed.content)
  ) {
    throw new Error(`${context} front matter does not match the published manifest.`)
  }
  const markdownBody = parsed.content.trim()
  const spokenText = normalizeForSpeech(stripAudioTagsFromMarkdown(markdownBody), locale)
  if (sha256(spokenText) !== entry.locales[locale].spokenTextSha256) {
    throw new Error(`${context} spoken text hash does not match the published manifest.`)
  }
  return { rawMarkdown, markdownBody, spokenText }
}

export function validateNotesSnapshot(value, { allowPreview = false } = {}) {
  if (
    !isRecord(value) ||
    value.version !== NOTES_SCHEMA_VERSION ||
    !isRecord(value.source) ||
    !nonEmptyString(value.source.kind) ||
    !nonEmptyString(value.source.commit) ||
    !isRecord(value.manifest) ||
    !Array.isArray(value.notes)
  ) {
    throw new Error('Notes snapshot has an invalid shape.')
  }
  const preview = value.source.kind === 'local-preview'
  if (preview && !allowPreview)
    throw new Error('Local notes previews are only allowed in development.')
  const manifest = validateManifest(value.manifest, preview)
  if (value.notes.length !== manifest.notes.length) {
    throw new Error('Notes snapshot and manifest contain different note counts.')
  }
  const entries = new Map(manifest.notes.map((entry) => [entry.id, entry]))
  for (const [index, note] of value.notes.entries()) {
    if (!isRecord(note) || !entries.has(note.id) || !isRecord(note.locales)) {
      throw new Error(`Notes snapshot entry ${index} does not match its manifest.`)
    }
    const manifestEntry = entries.get(note.id)
    for (const locale of NOTE_LOCALES) {
      const localeEntry = note.locales[locale]
      const manifestLocale = manifestEntry.locales[locale]
      if (
        !isRecord(localeEntry) ||
        (localeEntry.rawMarkdown !== undefined && typeof localeEntry.rawMarkdown !== 'string') ||
        typeof localeEntry.markdownBody !== 'string' ||
        typeof localeEntry.spokenText !== 'string'
      ) {
        throw new Error(`Notes snapshot ${note.id}/${locale} has invalid source text.`)
      }
      if (
        localeEntry.markdownSha256 !== manifestLocale.markdownSha256 ||
        localeEntry.spokenTextSha256 !== manifestLocale.spokenTextSha256
      ) {
        throw new Error(`Notes snapshot ${note.id}/${locale} hashes do not match its manifest.`)
      }
    }
  }
  return value
}

function decodeFileContent(body, context) {
  if (!isRecord(body) || body.encoding !== 'base64' || typeof body.content !== 'string') {
    throw new Error(`${context} did not return base64 file content.`)
  }
  return Buffer.from(body.content, 'base64').toString('utf8')
}

function validateRepository(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value)) {
    throw new Error('NOTES_REPOSITORY must use the owner/repository form.')
  }
  return value
}

function repositoryParts(repository) {
  const [owner, name] = validateRepository(repository).split('/')
  return { owner, name }
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Notes request timed out after ${timeoutMs}ms for ${url}.`, { cause: error })
    }
    throw new Error(
      `Notes request failed for ${url}: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error },
    )
  } finally {
    clearTimeout(timer)
  }
}

function githubHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cekrause-portfolio-notes-sync',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function githubJson(fetchImpl, url, token, timeoutMs) {
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    { headers: githubHeaders(token) },
    timeoutMs,
  )
  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === 'string' ? `: ${body.message}` : ''
    throw new Error(`GitHub notes request failed (${response.status}) for ${url}${message}`)
  }
  return body
}

async function resolveRemoteCommit({ fetchImpl, repository, ref, apiBase, token, timeoutMs }) {
  const { owner, name } = repositoryParts(repository)
  const url = new URL(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(ref)}`,
    apiBase,
  )
  const body = await githubJson(fetchImpl, url.toString(), token, timeoutMs)
  if (!isRecord(body) || typeof body.sha !== 'string' || !/^[a-f0-9]{40}$/u.test(body.sha)) {
    throw new Error(`GitHub did not return a valid commit SHA for ${repository}@${ref}.`)
  }
  return body.sha
}

async function readRemoteFile({
  fetchImpl,
  repository,
  commit,
  filePath,
  apiBase,
  token,
  timeoutMs,
}) {
  const { owner, name } = repositoryParts(repository)
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const url = new URL(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodedPath}`,
    apiBase,
  )
  url.searchParams.set('ref', commit)
  const body = await githubJson(fetchImpl, url.toString(), token, timeoutMs)
  return decodeFileContent(body, `${repository}@${commit}:${filePath}`)
}

async function buildSnapshot({ manifestSource, source, readFileAtPin }) {
  const manifest = validateManifest(JSON.parse(manifestSource))
  const notes = []
  for (const entry of manifest.notes) {
    const locales = {}
    for (const locale of NOTE_LOCALES) {
      const manifestLocale = entry.locales[locale]
      const rawMarkdown = await readFileAtPin(manifestLocale.markdownPath)
      const parsed = parseAndValidateSource(rawMarkdown, entry, locale)
      locales[locale] = {
        ...manifestLocale,
        rawMarkdown: parsed.rawMarkdown,
        markdownBody: parsed.markdownBody,
        spokenText: parsed.spokenText,
      }
    }
    notes.push({
      id: entry.id,
      slug: entry.slug,
      status: entry.status,
      date: entry.date,
      publishedAt: entry.publishedAt,
      locales,
    })
  }
  const snapshot = { version: NOTES_SCHEMA_VERSION, source, manifest, notes }
  validateNotesSnapshot(snapshot)
  return snapshot
}

async function writeSnapshotAtomic(outputPath, snapshot) {
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${randomUUID()}`
  try {
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, outputPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => {})
    throw error
  }
}

function localAssetUrl(noteId, locale, generationHash, asset) {
  return '/api/notes-assets/' + noteId + '/' + locale + '/' + generationHash + '/' + asset
}

async function findLocalGeneratedAssets({
  localPath,
  noteId,
  locale,
  markdownSha256,
  spokenTextSha256,
  spokenText,
}) {
  const directory = path.join(localPath, '.notes', 'generated', noteId, locale)
  let pointer
  try {
    pointer = JSON.parse(await readFile(path.join(directory, 'current.json'), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    return null
  }
  if (
    !isRecord(pointer) ||
    pointer.version !== 1 ||
    typeof pointer.generationConfigHash !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(pointer.generationConfigHash) ||
    pointer.markdownSha256 !== markdownSha256 ||
    pointer.spokenTextSha256 !== spokenTextSha256
  ) {
    return null
  }
  const generatedPath = path.join(directory, pointer.generationConfigHash)
  try {
    const [audioInfo, alignmentSource] = await Promise.all([
      stat(path.join(generatedPath, 'audio.mp3')),
      readFile(path.join(generatedPath, 'alignment.json'), 'utf8'),
    ])
    const alignment = JSON.parse(alignmentSource)
    if (
      !audioInfo.isFile() ||
      audioInfo.size === 0 ||
      !isRecord(alignment) ||
      alignment.noteId !== noteId ||
      alignment.locale !== locale ||
      alignment.spokenText !== spokenText ||
      !Number.isInteger(alignment.durationMs) ||
      alignment.durationMs <= 0
    ) {
      return null
    }
    return {
      generationConfigHash: pointer.generationConfigHash,
      audioUrl: localAssetUrl(noteId, locale, pointer.generationConfigHash, 'audio.mp3'),
      alignmentUrl: localAssetUrl(noteId, locale, pointer.generationConfigHash, 'alignment.json'),
      durationMs: alignment.durationMs,
    }
  } catch {
    // Ignore incomplete or invalid local generations.
    return null
  }
}

async function buildLocalNotesSnapshot(localPath) {
  // Preview the working tree, including uncommitted drafts, without publishing
  // an audio manifest or requiring the notes repository's installed dependencies.
  const directory = path.join(localPath, 'content/notes')
  let folders
  try {
    folders = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    // Preserve support for an initialized, empty manifest-only source.
    const manifestSource = await readFile(path.join(localPath, '.notes/manifest.json'), 'utf8')
    return buildSnapshot({
      manifestSource,
      source: { kind: 'local', commit: 'working-tree' },
      readFileAtPin: (filePath) => readFile(path.join(localPath, filePath), 'utf8'),
    })
  }
  let published = []
  try {
    published = validateManifest(
      JSON.parse(await readFile(path.join(localPath, '.notes/manifest.json'), 'utf8')),
      true,
    ).notes
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const notes = []
  for (const folder of folders
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    assertId(folder.name, 'Local note directory')
    const locales = {}
    let identity
    for (const locale of NOTE_LOCALES) {
      const markdownPath = `content/notes/${folder.name}/note${locale === 'en' ? '' : `.${locale}`}.md`
      const rawMarkdown = await readFile(path.join(localPath, markdownPath), 'utf8')
      const parsed = matter(rawMarkdown)
      const data = parsed.data
      const current = {
        id: data.id,
        slug: data.id,
        status: data.status,
        date: normalizedDate(data.date),
        publishedAt: normalizedTimestamp(data.publishedAt),
      }
      if (
        data.id !== folder.name ||
        data.locale !== locale ||
        (identity && JSON.stringify(identity) !== JSON.stringify(current))
      )
        throw new Error(`Local note ${folder.name}/${locale} has inconsistent metadata.`)
      identity = current
      const markdownBody = parsed.content.trim()
      const spokenText = normalizeForSpeech(stripAudioTagsFromMarkdown(markdownBody), locale)
      const markdownSha256 = sha256(rawMarkdown)
      const spokenTextSha256 = sha256(spokenText)
      const asset = published.find((entry) => entry.id === data.id)?.locales[locale]
      const localAsset =
        data.status === 'published'
          ? await findLocalGeneratedAssets({
              localPath,
              noteId: data.id,
              locale,
              markdownSha256,
              spokenTextSha256,
              spokenText,
            })
          : null
      const reusable =
        data.status === 'published' &&
        (localAsset ||
          (asset?.markdownSha256 === markdownSha256 &&
            asset?.spokenTextSha256 === spokenTextSha256))
      locales[locale] = {
        markdownPath,
        title: data.title,
        summary: data.summary,
        markdownSha256,
        spokenTextSha256,
        rawMarkdown,
        markdownBody,
        spokenText,
        audioUrl: localAsset?.audioUrl ?? (reusable ? asset.audioUrl : ''),
        alignmentUrl: localAsset?.alignmentUrl ?? (reusable ? asset.alignmentUrl : ''),
        durationMs: localAsset?.durationMs ?? (reusable ? asset.durationMs : 0),
        generationConfigHash:
          localAsset?.generationConfigHash ??
          (reusable ? asset.generationConfigHash : spokenTextSha256),
      }
    }
    notes.push({ ...identity, locales })
  }
  const snapshot = {
    version: 1,
    source: { kind: 'local-preview', commit: 'working-tree' },
    manifest: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      notes,
    },
    notes,
  }
  validateNotesSnapshot(snapshot, { allowPreview: true })
  return snapshot
}

export async function syncNotes({
  mode = 'development',
  repository = process.env.NOTES_REPOSITORY?.trim(),
  ref = process.env.NOTES_REF?.trim() || DEFAULT_NOTES_REF,
  localPath = process.env.NOTES_LOCAL_PATH?.trim() || DEFAULT_NOTES_LOCAL_PATH,
  token = process.env.GITHUB_TOKEN?.trim() || '',
  apiBase = 'https://api.github.com',
  outputPath = DEFAULT_NOTES_OUTPUT_PATH,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
} = {}) {
  if (mode !== 'development' && mode !== 'production')
    throw new Error(`Unsupported notes sync mode: ${mode}.`)
  if (process.env.NOTES_SYNC_SKIP === '1') {
    try {
      validateNotesSnapshot(JSON.parse(await readFile(outputPath, 'utf8')), {
        allowPreview: mode === 'development',
      })
    } catch (error) {
      throw new Error(`NOTES_SYNC_SKIP=1 requires a valid snapshot at ${outputPath}.`, {
        cause: error,
      })
    }
    return {
      skipped: true,
      snapshot: JSON.parse(await readFile(outputPath, 'utf8')),
    }
  }

  let snapshot
  if (repository) {
    try {
      if (typeof fetchImpl !== 'function')
        throw new Error('This Node.js version does not provide fetch.')
      const commit = await resolveRemoteCommit({
        fetchImpl,
        repository,
        ref,
        apiBase: new URL(apiBase),
        token,
        timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      })
      const readFileAtPin = (filePath) =>
        readRemoteFile({
          fetchImpl,
          repository,
          commit,
          filePath,
          apiBase: new URL(apiBase),
          token,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        })
      const manifestSource = await readFileAtPin('.notes/manifest.json')
      snapshot = await buildSnapshot({
        manifestSource,
        source: { kind: 'github', repository, commit },
        readFileAtPin,
      })
    } catch (remoteError) {
      if (mode !== 'development') throw remoteError
      console.warn(`Remote notes sync failed; trying local notes at ${localPath}.`)
      try {
        snapshot = await buildLocalNotesSnapshot(localPath)
      } catch (localError) {
        throw new Error(
          `Notes sync failed for both remote and local sources. Remote: ${remoteError.message} Local (${localPath}): ${localError.message}`,
          { cause: new AggregateError([remoteError, localError]) },
        )
      }
    }
  } else if (mode === 'development') {
    snapshot = await buildLocalNotesSnapshot(localPath)
  } else {
    snapshot = {
      version: NOTES_SCHEMA_VERSION,
      source: { kind: 'empty', commit: 'none' },
      manifest: {
        schemaVersion: NOTES_SCHEMA_VERSION,
        generatedAt: now,
        notes: [],
      },
      notes: [],
    }
  }

  await writeSnapshotAtomic(outputPath, snapshot)
  return { skipped: false, snapshot }
}

async function main() {
  const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='))
  const mode = modeArgument ? modeArgument.slice('--mode='.length) : 'development'
  loadEnvConfig(process.cwd(), mode === 'development', console, true)
  const result = await syncNotes({ mode })
  if (result.skipped) {
    console.log(`Skipping notes reconciliation because NOTES_SYNC_SKIP=1.`)
    return
  }
  const label =
    result.snapshot.source.kind === 'local-preview' ? 'local note preview' : 'published note'
  console.log(
    `Wrote ${result.snapshot.notes.length} ${label}${result.snapshot.notes.length === 1 ? '' : 's'} to ${DEFAULT_NOTES_OUTPUT_PATH}.`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
