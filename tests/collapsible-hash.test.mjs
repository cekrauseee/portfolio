import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readCollapsibleHash,
  subscribeToCollapsibleHash,
  writeCollapsibleHash,
  getCollapsibleHashSnapshot,
} from '../src/lib/use-collapsible-hash.ts'

test('resolves only known destinations, including encoded slugs', () => {
  assert.equal(readCollapsibleHash('#project/demo', 'project/', ['demo']), 'demo')
  assert.equal(readCollapsibleHash('#experience/demo', 'project/', ['demo']), null)
  assert.equal(readCollapsibleHash('#project/missing', 'project/', ['demo']), null)
  assert.equal(readCollapsibleHash('#project/%E0%A4', 'project/', ['demo']), null)
  assert.equal(readCollapsibleHash('#project/ol%C3%A1', 'project/', ['olá']), 'olá')
  assert.equal(readCollapsibleHash('#schedule', '', ['schedule']), 'schedule')
  assert.equal(readCollapsibleHash('', '', ['schedule']), null)
})

test('opening, switching, closing and history navigation synchronize subscribers', (t) => {
  const events = new EventTarget()
  const location = new URL('https://example.com/?source=shared')
  const entries = []
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: Object.assign(events, {
      location,
      history: {
        pushState(_state, _title, url) {
          entries.push(url)
          location.href = new URL(url, location).href
        },
      },
    }),
  })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else delete globalThis.window
  })
  const seen = []
  const unsubscribe = subscribeToCollapsibleHash(() => seen.push(location.hash))
  assert.equal(getCollapsibleHashSnapshot().source, 'hash')
  assert.equal(getCollapsibleHashSnapshot(), getCollapsibleHashSnapshot())
  writeCollapsibleHash('project/', ['demo'], 'demo')
  assert.equal(location.hash, '#project/demo')
  const clicked = getCollapsibleHashSnapshot()
  assert.deepEqual(clicked, { hash: '#project/demo', source: 'interaction' })
  assert.equal(getCollapsibleHashSnapshot(), clicked)
  writeCollapsibleHash('project/', ['demo'], 'demo')
  assert.equal(entries.length, 1)
  writeCollapsibleHash('experience/', ['company'], 'company')
  writeCollapsibleHash('project/', ['demo'], null)
  assert.equal(location.hash, '#experience/company')
  assert.equal(entries.length, 2)
  writeCollapsibleHash('experience/', ['company'], null)
  assert.equal(location.href, 'https://example.com/?source=shared')
  location.hash = '#project/demo'
  events.dispatchEvent(new Event('popstate'))
  assert.deepEqual(getCollapsibleHashSnapshot(), { hash: '#project/demo', source: 'hash' })
  location.hash = '#schedule'
  events.dispatchEvent(new Event('hashchange'))
  assert.deepEqual(getCollapsibleHashSnapshot(), { hash: '#schedule', source: 'hash' })
  assert.deepEqual(seen, ['#project/demo', '#experience/company', '', '#project/demo', '#schedule'])
  writeCollapsibleHash('', ['schedule'], 'missing')
  assert.equal(entries.length, 3)
  unsubscribe()
  events.dispatchEvent(new Event('popstate'))
  assert.equal(seen.length, 5)
})
