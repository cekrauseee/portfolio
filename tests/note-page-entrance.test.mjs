import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotePageEntrance } from '../src/components/note-page-entrance.tsx'

function renderPage() {
  return renderToStaticMarkup(
    createElement(NotePageEntrance, null, createElement('article', null, 'Note content')),
  )
}

function browserDocument(t, noteTransition) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: { dataset: { noteTransition } } },
  })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous)
    else delete globalThis.document
  })
}

test('direct note requests include the entrance and readable content before hydration', () => {
  const html = renderPage()
  assert.match(html, /<main[^>]*data-note-page="true"/)
  assert.match(html, /data-note-entry="true"/)
  assert.match(html, /<article>Note content<\/article>/)
})

test('the first browser render agrees with the server on direct loads and reloads', (t) => {
  browserDocument(t)
  assert.match(renderPage(), /data-note-entry="true"/)
})

test('navigation with a route transition suppresses the separate page entrance', (t) => {
  browserDocument(t, 'open')
  assert.match(renderPage(), /data-note-entry="false"/)
})
