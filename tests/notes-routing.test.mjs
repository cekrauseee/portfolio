import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { localizeNote, parseNotesSnapshot, readableNote } from '../src/content/notes.ts'
import { en } from '../src/i18n/dictionaries/en.ts'
import { ja } from '../src/i18n/dictionaries/ja.ts'
import { pt } from '../src/i18n/dictionaries/pt.ts'
import {
  noteMetadata,
  notePath,
  noteSitemapEntries,
  noteStructuredData,
} from '../src/features/notes/metadata.ts'
import {
  parseNoteReturnPoint,
  rememberNoteReturn,
  noteReturnPoint,
  canGoBackFromNote,
} from '../src/features/notes/navigation.ts'
import { site } from '../src/config/site.ts'

const snapshot = parseNotesSnapshot(
  JSON.parse(readFileSync(new URL('../fixtures/notes-published.json', import.meta.url), 'utf8')),
)
const note = localizeNote(snapshot.notes[0], 'en')
const dictionaries = { en, pt, ja }

test('each locale gets concise translated ID metadata with the same canonical route', () => {
  for (const locale of ['en', 'pt', 'ja']) {
    const localized = localizeNote(snapshot.notes[0], locale)
    const pageTitle = dictionaries[locale].home.notes.pageTitles[localized.id]
    const metadata = noteMetadata(localized, dictionaries[locale].home.notes.pageTitles)
    assert.equal(metadata.alternates.canonical, notePath(note.slug))
    assert.equal(metadata.title, pageTitle)
    assert.equal(metadata.description, localized.summary)
    assert.equal(metadata.openGraph.type, 'article')
    assert.equal(metadata.openGraph.title, pageTitle)
    assert.equal(metadata.twitter.title, pageTitle)
    assert.equal(metadata.robots.index, true)
  }
})

test('metadata falls back to the stable ID when a translation is unavailable', () => {
  const metadata = noteMetadata({ ...note, title: 'a very long editorial title' })
  assert.equal(metadata.title, note.id)
  assert.equal(metadata.openGraph.title, note.id)
  assert.equal(metadata.twitter.title, note.id)
})

test('structured article data identifies the post, language, author and actual publication time', () => {
  const data = noteStructuredData(note)
  assert.equal(data['@type'], 'BlogPosting')
  assert.equal(data.url, site.url + notePath(note.slug))
  assert.equal(data.mainEntityOfPage['@id'], data.url)
  assert.equal(data.headline, note.title)
  assert.equal(data.datePublished, note.publishedAt)
  assert.equal(data.author.url, site.url)
  assert.equal(data.inLanguage, 'en')
  assert.equal('dateModified' in data, false)
})

test('drafts are noindex and never appear in the sitemap', () => {
  const draft = { ...note, slug: 'draft-note', status: 'draft', publishedAt: null }
  assert.equal(noteMetadata(draft).robots.index, false)
  const entries = noteSitemapEntries([note, draft])
  assert.deepEqual(
    entries.map((entry) => entry.url),
    [site.url + notePath(note.slug)],
  )
  assert.equal('lastModified' in entries[0], false)
})

test('localized notes and reader payloads exclude unused translations and raw Markdown', () => {
  assert.equal('locales' in note, false)
  const payload = readableNote(note)
  assert.equal(payload.spokenText, note.spokenText)
  assert.equal(payload.audioUrl, note.audioUrl)
  assert.equal('rawMarkdown' in payload, false)
  assert.equal('markdownBody' in payload, false)
  assert.equal('locales' in payload, false)
})

test('return positions accept valid history data and reject malformed or unsafe storage', () => {
  const point = { slug: 'a-note', scrollTop: 800, triggerTop: 100 }
  assert.deepEqual(parseNoteReturnPoint(JSON.stringify(point)), point)
  for (const value of [
    null,
    'bad json',
    '{}',
    '{"slug":"../bad","scrollTop":0,"triggerTop":0}',
    '{"slug":"a-note","scrollTop":-1,"triggerTop":0}',
    '{"slug":"a-note","scrollTop":null,"triggerTop":0}',
  ]) {
    assert.equal(parseNoteReturnPoint(value), null)
  }
})

test('return navigation still works when browser storage is blocked', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() {
      throw new Error('blocked')
    },
  })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original)
    else delete globalThis.sessionStorage
  })
  const point = { slug: 'a-note', scrollTop: 850, triggerTop: 140 }
  rememberNoteReturn(point)
  assert.deepEqual(noteReturnPoint(), point)
  assert.equal(canGoBackFromNote('a-note'), true)
  assert.equal(canGoBackFromNote('different-note'), false)
})
