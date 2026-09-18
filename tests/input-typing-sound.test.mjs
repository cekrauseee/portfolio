import assert from 'node:assert/strict'
import test from 'node:test'
import { bindInputTypingSounds } from '../src/lib/typing-sound.ts'

function fixture(t, unlock = async () => true) {
  class Field {
    isConnected = true
    marked = true
    disabled = false
    inert = false
    type = 'text'
    matches(selector) {
      if (selector.includes('input[type=')) return selector.includes(`input[type="${this.type}"]`)
      return selector.includes('data-typing-sound') ? this.marked : this.disabled
    }
    closest() {
      return this.inert ? {} : null
    }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Element')
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: Field })
  const field = new Field()
  const listeners = new Map()
  const root = {
    hidden: false,
    activeElement: field,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  }
  const sounds = []
  let destroyed = 0
  let stopped = 0
  const cleanup = bindInputTypingSounds(root, {
    unlock,
    play: (...args) => sounds.push(args),
    stopAll: () => {
      stopped++
    },
    destroy: async () => {
      destroyed++
    },
  })
  t.after(() => {
    cleanup()
    if (previous) Object.defineProperty(globalThis, 'Element', previous)
    else delete globalThis.Element
  })
  return {
    field,
    root,
    sounds,
    listeners,
    cleanup,
    destroyed: () => destroyed,
    stopped: () => stopped,
    input(type, overrides = {}) {
      listeners.get('input')?.({
        target: field,
        isTrusted: true,
        inputType: type,
        isComposing: false,
        ...overrides,
      })
    },
  }
}

test('typing, deleting and inserting a line trigger the Zen typing cue', async (t) => {
  const view = fixture(t)
  for (const type of [
    'insertText',
    'deleteContentBackward',
    'deleteContentForward',
    'insertLineBreak',
  ]) {
    view.input(type)
    await Promise.resolve()
  }
  assert.equal(view.sounds.length, 4)
  assert.deepEqual(view.sounds[0], ['typing', { retrigger: 'restart', volume: 0.3 }])
})

test('paste, drop, replacement, undo and synthetic edits stay silent', async (t) => {
  const view = fixture(t)
  for (const type of [
    'insertFromPaste',
    'insertFromDrop',
    'insertReplacementText',
    'historyUndo',
    'historyRedo',
  ])
    view.input(type)
  view.input('insertText', { isTrusted: false })
  await Promise.resolve()
  assert.deepEqual(view.sounds, [])
})

test('IME previews are silent and the committed text sounds once', async (t) => {
  const view = fixture(t)
  view.input('insertCompositionText', { isComposing: true })
  view.input('insertCompositionText', { isComposing: true })
  await Promise.resolve()
  assert.deepEqual(view.sounds, [])
  view.input('insertFromComposition')
  await Promise.resolve()
  assert.equal(view.sounds.length, 1)
})

test('only marked, focused, enabled and visible fields can play', async (t) => {
  const view = fixture(t)
  view.field.marked = false
  view.input('insertText')
  await Promise.resolve()
  view.field.marked = true
  view.field.disabled = true
  view.input('insertText')
  await Promise.resolve()
  view.field.disabled = false
  view.field.inert = true
  view.input('insertText')
  await Promise.resolve()
  view.field.inert = false
  view.root.hidden = true
  view.input('insertText')
  await Promise.resolve()
  view.root.hidden = false
  view.root.activeElement = null
  view.input('insertText')
  await Promise.resolve()
  assert.deepEqual(view.sounds, [])
})

test('leaving a field discards a pending unlock and cleanup removes listeners', async (t) => {
  let resolve
  const view = fixture(
    t,
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  view.input('insertText')
  view.listeners.get('blur')()
  resolve(true)
  await Promise.resolve()
  assert.deepEqual(view.sounds, [])
  assert.equal(view.stopped(), 1)
  view.cleanup()
  assert.equal(view.listeners.size, 0)
  assert.equal(view.destroyed(), 1)
})

test('native date and time edits sound without an InputEvent inputType', async (t) => {
  const view = fixture(t)
  for (const type of ['date', 'time', 'datetime-local', 'month', 'week']) {
    view.field.type = type
    view.input(undefined)
    await Promise.resolve()
  }
  assert.equal(view.sounds.length, 5)
  view.field.type = 'text'
  view.input(undefined)
  await Promise.resolve()
  assert.equal(view.sounds.length, 5)
  view.field.type = 'date'
  view.input(undefined, { isTrusted: false })
  view.input('insertFromPaste')
  await Promise.resolve()
  assert.equal(view.sounds.length, 5)
})
