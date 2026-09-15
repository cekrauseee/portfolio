import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  normalizeNoteForSpeech,
  stripAudioTagsFromMarkdown,
} from '../src/content/notes-markdown.ts'
import { localizeNote, parseNotesSnapshot } from '../src/content/notes.ts'
import { syncNotes } from '../scripts/sync-notes.mjs'

function hash(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function source({ locale, title, summary, body }) {
  return `---\nid: published-note\nstatus: published\ndate: 2026-09-10\ntitle: "${title}"\nsummary: "${summary}"\nlocale: ${locale}\npublishedAt: 2026-09-10T00:00:00.000Z\n---\n\n${body}\n`
}

function manifestFor(sources) {
  const locales = Object.fromEntries(
    Object.entries(sources).map(([locale, rawMarkdown]) => [
      locale,
      {
        markdownSha256: hash(rawMarkdown),
        spokenTextSha256: hash(
          normalizeNoteForSpeech(
            stripAudioTagsFromMarkdown(rawMarkdown.split('---\n').slice(2).join('---\n').trim()),
            locale,
          ),
        ),
        generationConfigHash: 'a'.repeat(64),
        markdownPath: `content/notes/published-note/note${locale === 'en' ? '' : `.${locale}`}.md`,
        title: locale === 'en' ? 'a note' : locale === 'pt' ? 'uma nota' : 'ノート',
        summary: locale === 'en' ? 'a summary' : locale === 'pt' ? 'um resumo' : '概要',
        audioUrl: `https://notes.public.blob.vercel-storage.com/published-note/${locale}.mp3`,
        alignmentUrl: `https://notes.public.blob.vercel-storage.com/published-note/${locale}.json`,
        durationMs: 1200,
      },
    ]),
  )
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-10T00:00:00.000Z',
    notes: [
      {
        id: 'published-note',
        slug: 'published-note',
        status: 'published',
        date: '2026-09-10',
        publishedAt: '2026-09-10T00:00:00.000Z',
        locales,
      },
    ],
  }
}

async function writeLocalNotes(root, sources) {
  await mkdir(path.join(root, '.notes'), { recursive: true })
  await mkdir(path.join(root, 'content/notes/published-note'), {
    recursive: true,
  })
  const manifest = manifestFor(sources)
  await writeFile(path.join(root, '.notes/manifest.json'), JSON.stringify(manifest))
  for (const [locale, rawMarkdown] of Object.entries(sources)) {
    await writeFile(path.join(root, manifest.notes[0].locales[locale].markdownPath), rawMarkdown)
  }
  return manifest
}

test('notes sync previews local source text and writes a validated snapshot atomically', async () => {
  const sourceRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-notes-source-'))
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-notes-output-'))
  const sources = {
    en: source({
      locale: 'en',
      title: 'a note',
      summary: 'a summary',
      body: 'a thought with **emphasis**.',
    }),
    pt: source({
      locale: 'pt',
      title: 'uma nota',
      summary: 'um resumo',
      body: 'uma ideia com **ênfase**.',
    }),
    ja: source({
      locale: 'ja',
      title: 'ノート',
      summary: '概要',
      body: 'まだ形になっていない考え。',
    }),
  }
  try {
    await writeLocalNotes(sourceRoot, sources)
    const result = await syncNotes({
      mode: 'development',
      localPath: sourceRoot,
      outputPath: path.join(outputRoot, 'notes.json'),
      now: '2026-09-10T00:00:00.000Z',
    })
    assert.equal(result.snapshot.notes.length, 1)
    assert.equal(result.snapshot.source.kind, 'local-preview')
    assert.equal(result.snapshot.source.commit, 'working-tree')
    assert.equal(result.snapshot.notes[0].locales.ja.markdownBody, 'まだ形になっていない考え。')
    assert.deepEqual(
      parseNotesSnapshot(JSON.parse(await readFile(path.join(outputRoot, 'notes.json'), 'utf8')), {
        allowPreview: true,
      }).notes.map((note) => note.id),
      ['published-note'],
    )
  } finally {
    await rm(sourceRoot, { recursive: true, force: true })
    await rm(outputRoot, { recursive: true, force: true })
  }
})

test('notes sync preserves tagged Markdown while deriving clean spoken text', async () => {
  const sourceRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-notes-tags-source-'))
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-notes-tags-output-'))
  const sources = {
    en: source({
      locale: 'en',
      title: 'a note',
      summary: 'a summary',
      body: '[calm, measured] A thought with [literal] brackets.',
    }),
    pt: source({
      locale: 'pt',
      title: 'uma nota',
      summary: 'um resumo',
      body: '[thoughtful] Uma ideia com [colchetes] literais.',
    }),
    ja: source({
      locale: 'ja',
      title: 'ノート',
      summary: '概要',
      body: '考えです。[reflective] [literal]を残します。',
    }),
  }
  try {
    await writeLocalNotes(sourceRoot, sources)
    const result = await syncNotes({
      mode: 'development',
      localPath: sourceRoot,
      outputPath: path.join(outputRoot, 'notes.json'),
    })
    assert.match(result.snapshot.notes[0].locales.en.markdownBody, /\[calm, measured\]/)
    assert.match(result.snapshot.notes[0].locales.en.rawMarkdown, /\[calm, measured\]/)
    assert.equal(
      result.snapshot.notes[0].locales.en.spokenText,
      'A thought with [literal] brackets.',
    )
    assert.equal(
      result.snapshot.notes[0].locales.pt.spokenText,
      'Uma ideia com [colchetes] literais.',
    )
    assert.equal(result.snapshot.notes[0].locales.ja.spokenText, '考えです。[literal]を残します。')
  } finally {
    await rm(sourceRoot, { recursive: true, force: true })
    await rm(outputRoot, { recursive: true, force: true })
  }
})

test('local preview exposes matching generated audio through local asset URLs', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'notes-local-assets-'))
  const sources = {
    en: source({
      locale: 'en',
      title: 'a note',
      summary: 'a summary',
      body: 'a thought.',
    }),
    pt: source({
      locale: 'pt',
      title: 'uma nota',
      summary: 'um resumo',
      body: 'uma ideia.',
    }),
    ja: source({
      locale: 'ja',
      title: 'ノート',
      summary: '概要',
      body: '考えです。',
    }),
  }
  const generationHash = 'b'.repeat(64)
  try {
    await writeLocalNotes(root, sources)
    for (const [locale, rawMarkdown] of Object.entries(sources)) {
      const body = rawMarkdown.split('---\n').slice(2).join('---\n').trim()
      const spokenText = normalizeNoteForSpeech(body, locale)
      const directory = path.join(
        root,
        '.notes',
        'generated',
        'published-note',
        locale,
        generationHash,
      )
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, 'audio.mp3'), Buffer.from('audio'))
      await writeFile(
        path.join(directory, 'alignment.json'),
        JSON.stringify({
          schemaVersion: 1,
          offsetConvention: 'utf-16-code-units',
          alignmentMethod: 'whisper-1-transcription-word-timestamps',
          noteId: 'published-note',
          locale,
          spokenText,
          durationMs: 1200,
          units: [],
          chunks: [],
        }),
      )
      await writeFile(
        path.join(root, '.notes', 'generated', 'published-note', locale, 'current.json'),
        JSON.stringify({
          version: 1,
          generationConfigHash: generationHash,
          markdownSha256: hash(rawMarkdown),
          spokenTextSha256: hash(spokenText),
        }),
      )
    }
    const result = await syncNotes({
      mode: 'development',
      repository: '',
      localPath: root,
      outputPath: path.join(root, 'snapshot.json'),
    })
    const note = result.snapshot.notes[0]
    for (const locale of ['en', 'pt', 'ja']) {
      assert.equal(
        note.locales[locale].audioUrl,
        '/api/notes-assets/published-note/' + locale + '/' + generationHash + '/audio.mp3',
      )
      assert.equal(
        note.locales[locale].alignmentUrl,
        '/api/notes-assets/published-note/' + locale + '/' + generationHash + '/alignment.json',
      )
      assert.equal(note.locales[locale].durationMs, 1200)
      assert.equal(note.locales[locale].generationConfigHash, generationHash)
    }
    assert.equal(parseNotesSnapshot(result.snapshot, { allowPreview: true }).notes.length, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('notes sync resolves a remote commit before reading manifest and Markdown', async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-notes-remote-'))
  const sources = {
    en: source({
      locale: 'en',
      title: 'a note',
      summary: 'a summary',
      body: 'a thought.',
    }),
    pt: source({
      locale: 'pt',
      title: 'uma nota',
      summary: 'um resumo',
      body: 'uma ideia.',
    }),
    ja: source({
      locale: 'ja',
      title: 'ノート',
      summary: '概要',
      body: '考え。',
    }),
  }
  const manifest = manifestFor(sources)
  const commit = 'a'.repeat(40)
  const calls = []
  try {
    const result = await syncNotes({
      mode: 'production',
      repository: 'fixture-owner/notes',
      ref: 'main',
      apiBase: 'https://github.test',
      outputPath: path.join(outputRoot, 'notes.json'),
      fetchImpl: async (url) => {
        calls.push(url)
        const parsed = new URL(url)
        if (parsed.pathname === '/repos/fixture-owner/notes/commits/main') {
          return Response.json({ sha: commit })
        }
        if (parsed.pathname === '/repos/fixture-owner/notes/contents/.notes/manifest.json') {
          return Response.json({
            encoding: 'base64',
            content: Buffer.from(JSON.stringify(manifest)).toString('base64'),
          })
        }
        const locale = parsed.pathname.match(/note(?:\.(pt|ja))?\.md$/)?.[1] ?? 'en'
        const body = sources[locale]
        return Response.json({
          encoding: 'base64',
          content: Buffer.from(body).toString('base64'),
        })
      },
    })
    assert.equal(result.snapshot.source.commit, commit)
    assert.ok(calls.slice(1).every((url) => new URL(url).searchParams.get('ref') === commit))
  } finally {
    await rm(outputRoot, { recursive: true, force: true })
  }
})

test('corrupt notes snapshots and draft manifest entries are rejected', () => {
  assert.throws(
    () =>
      parseNotesSnapshot({
        version: 1,
        source: { kind: 'empty', commit: 'none' },
        manifest: {
          schemaVersion: 1,
          generatedAt: '2026-09-10T00:00:00.000Z',
          notes: [{ status: 'draft' }],
        },
        notes: [],
      }),
    /manifest entry 0 is invalid|published/,
  )
})

test('the populated fixture preserves rich Markdown and every locale', async () => {
  const fixture = JSON.parse(
    await readFile(new URL('../fixtures/notes-published.json', import.meta.url), 'utf8'),
  )
  const snapshot = parseNotesSnapshot(fixture)
  const note = snapshot.notes[0]
  assert.equal(note.locales.en.markdownBody.includes('**small**'), true)
  assert.equal(note.locales.ja.markdownBody.includes('**小さな**'), true)
  assert.equal(localizeNote(note, 'en').contentLocale, 'en')
  assert.equal(localizeNote(note, 'pt').title, 'pensar em público')
  assert.equal(localizeNote(note, 'ja').title, '人前で考える')
  assert.equal(localizeNote(note, 'fr').title, localizeNote(note, 'en').title)
})

for (const failure of ['404', 'network']) {
  test(`development falls back to NOTES_LOCAL_PATH after a remote ${failure} failure`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'notes-fallback-'))
    try {
      const localPath = path.join(root, 'source')
      await mkdir(path.join(localPath, '.notes'), { recursive: true })
      await writeFile(
        path.join(localPath, '.notes/manifest.json'),
        JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-09-10T00:00:00.000Z',
          notes: [],
        }),
      )
      const outputPath = path.join(root, 'notes.json')
      const options = {
        repository: 'fixture-owner/notes',
        localPath,
        outputPath,
        fetchImpl: async () => {
          if (failure === 'network') throw new Error('offline')
          return Response.json({ message: 'Not Found' }, { status: 404 })
        },
      }
      const result = await syncNotes({ ...options, mode: 'development' })
      assert.equal(result.snapshot.source.kind, 'local')
      const saved = await readFile(outputPath, 'utf8')
      assert.equal(JSON.parse(saved).source.kind, 'local')
      await assert.rejects(syncNotes({ ...options, mode: 'production' }), /404|offline/)
      assert.equal(await readFile(outputPath, 'utf8'), saved)
      await rm(localPath, { recursive: true, force: true })
      await assert.rejects(
        syncNotes({ ...options, mode: 'development' }),
        /both remote and local sources/,
      )
      assert.equal(await readFile(outputPath, 'utf8'), saved)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
}

test('local preview includes drafts and unpublished media without weakening production', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'notes-drafts-'))
  try {
    const sources = Object.fromEntries(
      ['en', 'pt', 'ja'].map((locale) => [
        locale,
        source({
          locale,
          title: 'a draft',
          summary: 'preview',
          body: 'hello world.',
        })
          .replace('status: published', 'status: draft')
          .replace('publishedAt: 2026-09-10T00:00:00.000Z', 'publishedAt: null'),
      ]),
    )
    await writeLocalNotes(root, sources)
    // Local previews need no publisher manifest or generated assets.
    await rm(path.join(root, '.notes/manifest.json'))
    const options = {
      mode: 'development',
      repository: '',
      localPath: root,
      outputPath: path.join(root, 'snapshot.json'),
    }
    let result = await syncNotes(options)
    let parsed = parseNotesSnapshot(result.snapshot, { allowPreview: true })
    assert.equal(parsed.notes[0].status, 'draft')
    assert.equal(parsed.notes[0].publishedAt, null)
    assert.equal(parsed.notes[0].locales.en.audioUrl, '')
    assert.throws(
      () => parseNotesSnapshot(result.snapshot, { allowPreview: false }),
      /only allowed in development/,
    )
    for (const locale of ['en', 'pt', 'ja']) {
      const filename = locale === 'en' ? 'note.md' : `note.${locale}.md`
      await writeFile(
        path.join(root, 'content/notes/published-note', filename),
        sources[locale]
          .replace('status: draft', 'status: published')
          .replace('publishedAt: null', 'publishedAt: "2026-09-10T12:00:00.000Z"'),
      )
    }
    result = await syncNotes(options)
    parsed = parseNotesSnapshot(result.snapshot, { allowPreview: true })
    assert.equal(parsed.notes[0].status, 'published')
    assert.equal(parsed.notes[0].locales.en.audioUrl, '')
    const production = await syncNotes({ ...options, mode: 'production' })
    assert.equal(production.snapshot.notes.length, 0)
    assert.equal(production.snapshot.source.kind, 'empty')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
