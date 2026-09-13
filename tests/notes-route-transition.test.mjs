import { motion } from '../src/lib/motion.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createNoteTransitionGate,
  noteContextSide,
  noteBodyOffset,
  toolbarRevealInsets,
  startNoteRouteTransition,
  completeNoteRouteTransition,
  isNoteTransitionTo,
} from '../src/features/notes/route-transition.ts'

test('route snapshots wait for the requested destination and ignore unrelated commits', async () => {
  const gate = createNoteTransitionGate('/')
  let released = false
  void gate.ready.then(() => {
    released = true
  })
  assert.equal(gate.commit('/notes/a-note'), false)
  await Promise.resolve()
  assert.equal(released, false)
  assert.equal(gate.commit('/'), true)
  await gate.ready
  assert.equal(released, true)
  assert.equal(gate.commit('/'), false)
})

test('interrupted navigation releases its snapshot without claiming a later commit', async () => {
  const gate = createNoteTransitionGate('/notes/a-note')
  gate.cancel()
  await gate.ready
  assert.equal(gate.commit('/notes/a-note'), false)
})

test('surrounding content moves away from the selected note on both sides', () => {
  assert.equal(noteContextSide(100, 300), 'above')
  assert.equal(noteContextSide(600, 300), 'below')
})

function nativeFixture(t, reduced = false) {
  const calls = []
  const transitions = []
  const dataset = {}
  const globals = {
    window: { matchMedia: () => ({ matches: reduced }), innerHeight: 900 },
    CSS: { supports: () => true },
    document: {
      documentElement: { dataset },
      querySelectorAll: () => [],
      startViewTransition(update) {
        calls.push('capture')
        let finish
        const transition = {
          update,
          ready: Promise.resolve(),
          finished: new Promise((resolve) => {
            finish = resolve
          }),
          finish: () => finish(),
          skipTransition() {
            calls.push('skip')
            finish()
          },
        }
        transitions.push(transition)
        return transition
      },
    },
  }
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }
  return { calls, transitions, dataset }
}

test('closing captures the note before history navigation and waits for restored portfolio geometry', async (t) => {
  const f = nativeFixture(t)
  startNoteRouteTransition('a-note', 'close', '/', () => f.calls.push('back'))
  assert.deepEqual(f.calls, ['capture'])
  const update = f.transitions[0].update()
  assert.deepEqual(f.calls, ['capture', 'back'])
  assert.equal(isNoteTransitionTo('/'), true)
  let ready = false
  void update.then(() => {
    ready = true
  })
  completeNoteRouteTransition('/notes/a-note')
  await Promise.resolve()
  assert.equal(ready, false)
  completeNoteRouteTransition('/')
  await update
  assert.equal(ready, true)
  f.transitions[0].finish()
  await Promise.resolve()
  assert.equal(f.dataset.noteTransition, undefined)
})

test('repeated close requests do not navigate back twice', async (t) => {
  const f = nativeFixture(t)
  const navigate = () => f.calls.push('back')
  startNoteRouteTransition('a-note', 'close', '/', navigate)
  startNoteRouteTransition('a-note', 'close', '/', navigate)
  assert.equal(f.transitions.length, 1)
  const update = f.transitions[0].update()
  completeNoteRouteTransition('/')
  await update
  f.transitions[0].finish()
  await Promise.resolve()
  assert.deepEqual(f.calls, ['capture', 'back'])
})

test('a newer navigation cancels old animation without clearing the new transition', async (t) => {
  const f = nativeFixture(t)
  startNoteRouteTransition('first', 'open', '/notes/first', () => f.calls.push('first'))
  const oldUpdate = f.transitions[0].update()
  startNoteRouteTransition('second', 'open', '/notes/second', () => f.calls.push('second'))
  await oldUpdate
  assert.equal(f.dataset.noteTransition, 'open')
  assert.equal(isNoteTransitionTo('/notes/second'), true)
  const update = f.transitions[1].update()
  completeNoteRouteTransition('/notes/second')
  await update
  f.transitions[1].finish()
  await Promise.resolve()
  assert.equal(f.dataset.noteTransition, undefined)
})

test('reduced motion navigates immediately without capturing or delaying the page', (t) => {
  const f = nativeFixture(t, true)
  startNoteRouteTransition('a-note', 'close', '/', () => f.calls.push('back'))
  assert.deepEqual(f.calls, ['back'])
  assert.equal(f.dataset.noteTransition, undefined)
})

test('browsers without native view transitions still navigate and animate the destination', async (t) => {
  const f = nativeFixture(t)
  delete document.startViewTransition
  startNoteRouteTransition('a-note', 'close', '/', () => f.calls.push('back'))
  await new Promise(setImmediate)
  assert.deepEqual(f.calls, ['back'])
  completeNoteRouteTransition('/')
  await new Promise(setImmediate)
  assert.equal(f.dataset.noteTransition, undefined)
})

test('body follows the exact header displacement in both navigation directions', () => {
  const card = { left: 320, bottom: 520 }
  const article = { left: 300, bottom: 180 }
  assert.deepEqual(noteBodyOffset(card, article, 'open'), { x: 20, y: 340 })
  assert.deepEqual(noteBodyOffset(article, card, 'close'), { x: 20, y: 340 })
  assert.deepEqual(noteBodyOffset(article, article, 'open'), { x: 0, y: 0 })
})

test('toolbar reveal uses the compact pill dimensions without shrinking its icons', () => {
  const inset = toolbarRevealInsets(212, 48)
  assert.equal(212 - inset.x * 2, 36)
  assert.equal(48 - inset.y * 2, 28)
  assert.deepEqual(toolbarRevealInsets(36, 28), { x: 0, y: 0 })
  assert.deepEqual(toolbarRevealInsets(24, 24), { x: 0, y: 0 })
})

function sceneFixture(t, scrollTop) {
  const f = nativeFixture(t)
  class Element {
    constructor(tagName, rect, parentElement = null) {
      this.tagName = tagName
      this.rect = rect
      this.parentElement = parentElement
      this.children = []
      this.parts = new Map()
      this.isConnected = true
      this.animations = []
      const properties = new Map()
      this.style = {
        getPropertyValue: (name) => properties.get(name) ?? '',
        setProperty: (name, value) => properties.set(name, value),
        removeProperty: (name) => properties.delete(name),
      }
      parentElement?.children.push(this)
    }
    getClientRects() {
      return this.isConnected ? [this.rect] : []
    }
    getBoundingClientRect() {
      return this.rect
    }
    querySelector(selector) {
      return this.parts.get(selector) ?? null
    }
    closest() {
      return this.tagName === 'MAIN' ? this : this.parentElement?.closest()
    }
    matches() {
      return false
    }
    animate(states, options) {
      this.animations.push({ states, options })
      return { finished: Promise.resolve(), cancel() {} }
    }
  }
  for (const [key, value] of Object.entries({
    HTMLElement: Element,
    getComputedStyle: () => ({ overflowY: 'auto' }),
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }
  function scene(note) {
    const main = new Element('MAIN', { top: 0, bottom: 900, height: 900 })
    main.scrollTop = note ? scrollTop : 500
    const top = note ? 40 - scrollTop : 200
    const height = note ? 8000 : 140
    const article = new Element('ARTICLE', { top, bottom: top + height, height }, main)
    const header = new Element('HEADER', { top, bottom: top + 140, height: 140 }, article)
    article.parts.set('[data-note-header]', header)
    const text = ['title', 'summary', 'date'].map((part, index) => {
      const element = new Element(
        'P',
        { left: 100, top: top + index * 40, bottom: top + (index + 1) * 40, height: 40 },
        header,
      )
      article.parts.set(`[data-note-shared="${part}"]`, element)
      return element
    })
    return { main, article, header, text }
  }
  const note = scene(true)
  const home = scene(false)
  let current = note
  document.documentElement.style = new Element('HTML', {}).style
  document.querySelectorAll = (selector) =>
    selector === 'main'
      ? [current.main]
      : selector === '[data-note-card="a-note"]'
        ? [current.article]
        : []
  return {
    ...f,
    note,
    home,
    showHome() {
      current = home
      for (const element of [note.main, note.article, note.header, ...note.text])
        element.isConnected = false
    },
  }
}

test('return from the top matches compact headers while the viewport content exits separately', async (t) => {
  const f = sceneFixture(t, 0)
  startNoteRouteTransition('a-note', 'close', '/', f.showHome)
  assert.equal(f.note.main.style.getPropertyValue('view-transition-name'), 'note-outgoing-page')
  assert.equal(f.note.header.style.getPropertyValue('view-transition-name'), 'note-active')
  assert.equal(f.note.article.style.getPropertyValue('view-transition-name'), '')
  const update = f.transitions[0].update()
  completeNoteRouteTransition('/')
  await update
  assert.equal(f.home.header.style.getPropertyValue('view-transition-class'), 'note-container')
  assert.equal(f.home.text[0].style.getPropertyValue('view-transition-name'), 'note-active-title')
  f.transitions[0].finish()
  await Promise.resolve()
  assert.equal(f.note.main.style.getPropertyValue('view-transition-name'), '')
  assert.equal(f.home.header.style.getPropertyValue('view-transition-name'), '')
})

for (const scrollTop of [80, 4000, 7200]) {
  test(`return after scrolling ${scrollTop}px never pulls the offscreen header through the viewport`, async (t) => {
    const f = sceneFixture(t, scrollTop)
    startNoteRouteTransition('a-note', 'close', '/', f.showHome)
    assert.equal(f.note.main.scrollTop, scrollTop)
    assert.equal(f.note.main.style.getPropertyValue('view-transition-class'), 'note-page')
    assert.equal(f.note.header.style.getPropertyValue('view-transition-name'), '')
    assert.equal(f.note.text[0].style.getPropertyValue('view-transition-name'), '')
    const update = f.transitions[0].update()
    completeNoteRouteTransition('/')
    await update
    assert.equal(f.home.header.style.getPropertyValue('view-transition-class'), 'note-return-card')
    assert.equal(f.home.text[0].style.getPropertyValue('view-transition-name'), '')
    assert.equal(document.documentElement.style.getPropertyValue('--note-body-y'), '')
    f.transitions[0].finish()
    await Promise.resolve()
    assert.equal(f.dataset.noteTransition, undefined)
  })
}

test('the non-native return also uses short movement at the end of a long note', async (t) => {
  const f = sceneFixture(t, 7200)
  delete document.startViewTransition
  startNoteRouteTransition('a-note', 'close', '/', f.showHome)
  await new Promise(setImmediate)
  assert.equal(f.note.main.scrollTop, 7200)
  assert.equal(f.note.main.animations[0].states[1].transform, 'translateY(-12px)')
  assert.equal(f.note.main.animations[0].options.duration, motion.duration.settle)
  completeNoteRouteTransition('/')
  await new Promise(setImmediate)
  assert.equal(f.home.header.animations[0].states[0].transform, 'translateY(12px)')
  assert.equal(f.dataset.noteTransition, undefined)
})
