import assert from 'node:assert/strict'
import test from 'node:test'
import {
  noteHeaderIsVisible,
  noteReturnScrollTop,
  noteViewport,
  restoreNoteReturn,
} from '../src/features/notes/route-restoration.ts'

const viewport = { top: 0, bottom: 600 }
const scroller = { scrollTop: 500, scrollHeight: 3000, clientHeight: 600 }
const anchor = { top: 1100, height: 140 }

test('returning preserves the original card position when it still fits', () => {
  assert.equal(noteReturnScrollTop(anchor, viewport, scroller, 200), 1400)
})

test('resized viewports keep the complete card inside the visible area', () => {
  assert.equal(noteReturnScrollTop(anchor, viewport, scroller, 860), 1164)
  assert.equal(noteReturnScrollTop(anchor, viewport, scroller, -100), 1576)
  assert.equal(noteReturnScrollTop({ ...anchor, height: 800 }, viewport, scroller, 200), 1576)
})

test('direct visits have a visible return position without a remembered click', () => {
  assert.equal(noteReturnScrollTop(anchor, viewport, scroller), 1504)
})

test('return positions respect both ends of the destination scrollport', () => {
  assert.equal(
    noteReturnScrollTop({ top: 0, height: 100 }, viewport, { ...scroller, scrollTop: 0 }),
    0,
  )
  assert.equal(noteReturnScrollTop({ ...anchor, top: 9000 }, viewport, scroller), 2400)
})

test('only a fully visible header can morph back into its card', () => {
  assert.equal(noteHeaderIsVisible({ top: 24, bottom: 160, height: 136 }, viewport), true)
  for (const header of [
    { top: -6000, bottom: -5864, height: 136 },
    { top: -10, bottom: 126, height: 136 },
    { top: 550, bottom: 686, height: 136 },
    { top: 24, bottom: 24, height: 0 },
  ])
    assert.equal(noteHeaderIsVisible(header, viewport), false)
})

function restoreFixture(t, point = null, hasCard = true) {
  const calls = []
  const main = {
    dataset: {},
    scrollTop: 200,
    scrollHeight: 3000,
    clientHeight: 700,
    getBoundingClientRect: () => ({ top: 0, bottom: 700 }),
    getClientRects: () => [{}],
    querySelector: (selector) => (selector === '#notes-heading' || hasCard ? anchor : null),
    scrollTo({ top, behavior }) {
      assert.equal(this.dataset.noteReturning, 'true')
      assert.equal(behavior, 'instant')
      calls.push('scroll')
      this.scrollTop = top
    },
  }
  const anchor = {
    closest: () => main,
    getBoundingClientRect() {
      assert.equal(main.dataset.noteReturning, 'true')
      return { top: 1600 - main.scrollTop, height: 120 }
    },
    setAttribute: (name, value) => calls.push([name, value]),
    focus(options) {
      assert.deepEqual(options, { preventScroll: true })
      calls.push('focus')
    },
  }
  const globals = {
    document: { scrollingElement: {}, querySelectorAll: () => [main] },
    window: { innerHeight: 700 },
    getComputedStyle: () => ({ overflowY: 'auto' }),
    sessionStorage: { getItem: () => JSON.stringify(point) },
  }
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }
  return { main, anchor, calls }
}

test('restoration suppresses home entrance before measuring and restores focus without another scroll', (t) => {
  const f = restoreFixture(t, { slug: 'a-note', scrollTop: 1390, triggerTop: 210 })
  restoreNoteReturn('a-note')
  assert.equal(f.main.scrollTop, 1390)
  assert.deepEqual(f.calls, ['scroll', 'focus'])
})

test('direct visits and stale return points still reveal the selected note', (t) => {
  const f = restoreFixture(t, { slug: 'other-note', scrollTop: 300, triggerTop: 650 })
  restoreNoteReturn('a-note')
  assert.equal(f.main.scrollTop, 1504)
  assert.deepEqual(f.calls, ['scroll', 'focus'])
})

test('a note outside the home list returns to the notes heading', (t) => {
  const f = restoreFixture(t, null, false)
  restoreNoteReturn('older-note')
  assert.equal(f.main.scrollTop, 1504)
  assert.deepEqual(f.calls, ['scroll', ['tabindex', '-1'], 'focus'])
})

test('visibility accounts for a nested scrollport and the mobile visual viewport', (t) => {
  const f = restoreFixture(t)
  f.main.getBoundingClientRect = () => ({ top: 70, bottom: 670 })
  window.visualViewport = { offsetTop: 110, height: 420 }
  assert.deepEqual(noteViewport(f.anchor), { top: 110, bottom: 530 })
  restoreNoteReturn('a-note')
  assert.equal(f.main.scrollTop, 1394)
})
