import assert from 'node:assert/strict'
import test from 'node:test'
import { createRoleFitStageMotion } from '../src/features/role-fit/stage-motion.ts'
import { motion } from '../src/lib/motion.ts'

function fixture(t, reduced = false) {
  let resize
  let clock = 0
  let disconnected = false
  const frames = new Map()
  let nextFrame = 0
  const preference = Object.assign(new EventTarget(), { matches: reduced })
  const scroller = Object.assign(new EventTarget(), {
    scrollTop: 0,
    scrollHeight: 2000,
    clientHeight: 800,
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
    scrollTo({ top }) {
      this.scrollTop = top
    },
  })
  function element(height, opacity) {
    return {
      naturalHeight: height,
      visualHeight: undefined,
      opacity,
      style: { height: '', overflow: '', minHeight: '', display: '' },
      animations: [],
      isConnected: true,
      actionOpen: true,
      closest(selector) {
        return selector === '[data-action-open="true"]' && !this.actionOpen ? null : scroller
      },
      getBoundingClientRect() {
        const measured =
          this.visualHeight ??
          (Number.parseFloat(this.style.height) ||
            Math.max(this.naturalHeight, Number.parseFloat(this.style.minHeight) || 0))
        return { top: 100, bottom: 100 + measured, height: measured }
      },
      animate(keyframes, options) {
        const animation = {
          keyframes,
          options,
          cancelled: false,
          onfinish: null,
          cancel() {
            this.cancelled = true
          },
          finish() {
            this.onfinish?.()
          },
        }
        this.animations.push(animation)
        return animation
      },
    }
  }
  const container = element(320, 1)
  const form = element(320, 1)
  const result = element(22, 0)
  const restored = []
  for (const [name, value] of Object.entries({
    window: Object.assign(new EventTarget(), { matchMedia: () => preference, innerHeight: 800 }),
    matchMedia: () => preference,
    getComputedStyle: (element) => ({ opacity: String(element.opacity), overflowY: 'auto' }),
    ResizeObserver: class {
      constructor(callback) {
        resize = callback
      }
      observe() {}
      disconnect() {
        disconnected = true
      }
    },
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, value })
    restored.push(() =>
      previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name],
    )
  }
  t.mock.method(performance, 'now', () => clock)
  const settled = []
  const controller = createRoleFitStageMotion(container, form, result, (stage) =>
    settled.push(stage),
  )
  t.after(() => {
    controller.dispose()
    restored.forEach((restore) => restore())
  })
  return {
    container,
    form,
    result,
    controller,
    settled,
    frames,
    scroller,
    step(time) {
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach((callback) => callback(time))
    },
    preference,
    resize: () => resize(),
    advance: (amount) => {
      clock += amount
    },
    disconnected: () => disconnected,
  }
}

test('submission replaces the form with a fade and shrinks to the loading text', (t) => {
  const view = fixture(t)
  view.controller.capture()
  view.controller.update('result')
  assert.equal(view.result.style.minHeight, '')
  assert.deepEqual(view.container.animations.at(-1).keyframes, [
    { height: '320px' },
    { height: '22px' },
  ])
  assert.equal(view.form.animations.at(-1).options.duration, motion.duration.feedback)
  assert.equal(view.result.animations.at(-1).options.duration, motion.duration.control)
  view.container.animations.at(-1).finish()
  assert.equal(view.controller.isTransitioning(), false)
  assert.equal(view.container.style.height, '')
  assert.equal(view.form.style.display, 'none')
  assert.deepEqual(view.settled, ['result'])
})

test('streaming updates on the same stage never restart the container swap', (t) => {
  const view = fixture(t)
  view.controller.capture()
  view.controller.update('result')
  const first = view.container.animations.at(-1)
  view.controller.update('result')
  assert.equal(view.container.animations.length, 1)
  assert.equal(first.cancelled, false)
})

test('response completion does not create a second container transition', (t) => {
  const view = fixture(t)
  view.controller.capture()
  view.controller.update('result')
  view.container.animations.at(-1).finish()
  view.result.naturalHeight = 220
  view.controller.capture()
  view.controller.update('result')
  assert.equal(view.container.animations.length, 1)
  assert.equal(view.result.style.minHeight, '')
})

test('returning to edit reverses from the displayed geometry and restores the form after settling', (t) => {
  const view = fixture(t)
  view.controller.capture()
  view.controller.update('result')
  const previous = view.container.animations.at(-1)
  view.container.visualHeight = 290
  view.form.opacity = 0.3
  view.result.opacity = 0.7
  view.controller.capture()
  view.controller.update('form')
  assert.equal(previous.cancelled, true)
  assert.equal(view.container.animations.at(-1).keyframes[0].height, '290px')
  assert.deepEqual(view.form.animations.at(-1).keyframes, [{ opacity: 0.3 }, { opacity: 1 }])
  assert.deepEqual(view.settled, [])
  view.container.animations.at(-1).finish()
  assert.deepEqual(view.settled, ['form'])
  assert.equal(view.result.style.display, 'none')
  assert.equal(view.result.style.minHeight, '')
  assert.equal(view.frames.size, 0)
})

test('content arriving during a swap retargets height without extending its deadline', (t) => {
  const view = fixture(t)
  view.controller.capture()
  view.controller.update('result')
  view.advance(100)
  view.result.naturalHeight = 400
  view.resize()
  assert.equal(view.container.animations.at(-1).options.duration, motion.duration.page - 100)
  assert.equal(view.container.animations.at(-1).keyframes[1].height, '400px')
  assert.equal(view.result.animations.length, 1)
})

test('reduced motion swaps immediately and disposes observers and temporary styles', (t) => {
  const view = fixture(t, true)
  view.controller.capture()
  view.controller.update('result')
  assert.equal(view.container.animations.length, 0)
  assert.deepEqual(view.settled, ['result'])
  view.controller.capture()
  view.controller.update('form')
  assert.deepEqual(view.settled, ['result', 'form'])
  assert.equal(view.result.style.display, 'none')
  view.controller.dispose()
  assert.equal(view.disconnected(), true)
  assert.equal(view.result.style.minHeight, '')
})

test('completion in a closed action does not start following the hidden result', (t) => {
  const view = fixture(t)
  view.controller.capture()
  view.controller.update('result')
  view.container.animations.at(-1).finish()
  view.container.actionOpen = false
  view.controller.capture()
  view.controller.update('result')
  assert.equal(view.frames.size, 0)
})

test('shrinking at the bottom releases only the scroll space removed by the container', (t) => {
  const view = fixture(t)
  view.scroller.scrollTop = 1200
  view.controller.capture()
  view.controller.update('result')
  view.step(0)
  assert.equal(view.scroller.scrollTop, 1200)
  view.container.visualHeight = 171
  view.step(180)
  assert.equal(view.scroller.scrollTop, 1051)
  view.container.visualHeight = 22
  view.step(360)
  assert.equal(view.scroller.scrollTop, 902)
  assert.equal(view.frames.size, 0)
})

test('shrinking away from the bottom does not reframe the page', (t) => {
  const view = fixture(t)
  view.scroller.scrollTop = 100
  view.controller.capture()
  view.controller.update('result')
  assert.equal(view.frames.size, 0)
  assert.equal(view.scroller.scrollTop, 100)
})

test('manual scrolling cancels the shrink adjustment', (t) => {
  const view = fixture(t)
  view.scroller.scrollTop = 1200
  view.controller.capture()
  view.controller.update('result')
  assert.equal(view.frames.size, 1)
  window.dispatchEvent(new Event('wheel'))
  assert.equal(view.frames.size, 0)
})
