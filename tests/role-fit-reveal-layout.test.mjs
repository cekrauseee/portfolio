import assert from 'node:assert/strict'
import test from 'node:test'
import { createRoleFitRevealLayout } from '../src/features/role-fit/reveal-layout.ts'
import { motion } from '../src/lib/motion.ts'

function scene(t, reduced = false) {
  const events = new EventTarget()
  let nextFrame = 0
  const frames = new Map()
  const scroller = Object.assign(new EventTarget(), {
    scrollTop: 0,
    scrollHeight: 2000,
    clientHeight: 800,
    scrollTo({ top }) {
      this.scrollTop = top
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
  })
  function block(top, height = 30) {
    return {
      top,
      height,
      offset: 0,
      parentElement: null,
      isConnected: true,
      effects: [],
      getBoundingClientRect() {
        return {
          top: this.top + this.offset - scroller.scrollTop,
          bottom: this.top + this.offset + this.height - scroller.scrollTop,
        }
      },
      animate(keyframes, options) {
        const resetOffset = () => {
          this.offset = 0
        }
        this.offset = Number(keyframes[0].translate.split(' ')[1].replace('px', ''))
        let resolveFinished
        const finished = new Promise((resolve) => {
          resolveFinished = resolve
        })
        const effect = {
          keyframes,
          options,
          cancelled: false,
          finished,
          finish() {
            resetOffset()
            resolveFinished()
          },
          cancel() {
            this.cancelled = true
            resetOffset()
          },
        }
        this.effects.push(effect)
        return effect
      },
    }
  }
  const edge = block(700)
  const footer = block(760)
  const page = { querySelectorAll: () => [footer] }
  const root = {
    getBoundingClientRect: () => ({ height: edge.top - 100 }),
    isConnected: true,
    closest: (selector) =>
      selector === 'main'
        ? scroller
        : selector === '[data-locale-content]'
          ? page
          : { querySelector: () => edge },
    querySelectorAll: () => [],
  }
  const restore = []
  for (const [name, value] of Object.entries({
    window: Object.assign(events, { innerHeight: 800, matchMedia: () => ({ matches: reduced }) }),
    getComputedStyle: () => ({ overflowY: 'auto' }),
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, value })
    restore.push(() =>
      original ? Object.defineProperty(globalThis, name, original) : delete globalThis[name],
    )
  }
  const layout = createRoleFitRevealLayout(root)
  t.after(() => {
    layout.cancel()
    restore.forEach((reset) => reset())
  })
  return {
    layout,
    edge,
    footer,
    scroller,
    events,
    frames,
    step() {
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach((callback) => callback())
    },
  }
}

test('response growth reuses locale motion for the close control and footer', (t) => {
  const view = scene(t)
  view.layout.capture()
  view.edge.top += 30
  view.footer.top += 30
  view.layout.animate()
  for (const element of [view.edge, view.footer]) {
    assert.equal(element.effects[0].keyframes[0].translate, '0 -30px')
    assert.equal(element.effects[0].options.duration, motion.duration.settle)
    assert.equal(element.effects[0].options.easing, motion.easing)
  }
})

test('another line continues from the current visual position despite viewport scroll', (t) => {
  const view = scene(t)
  view.layout.capture()
  view.edge.top += 30
  view.layout.animate()
  view.edge.offset = -15
  view.scroller.scrollTop = 100
  view.layout.capture()
  view.edge.top += 30
  view.layout.animate()
  assert.equal(view.edge.effects[0].cancelled, true)
  assert.equal(view.edge.effects[1].keyframes[0].translate, '0 -45px')
})

test('scroll follows the animated edge, yields to user input, and cleans up', (t) => {
  const view = scene(t)
  view.layout.capture()
  view.edge.top = 850
  view.layout.animate()
  view.edge.offset = 0
  view.step()
  assert.equal(view.scroller.scrollTop, 104)
  view.events.dispatchEvent(new Event('wheel'))
  view.edge.top += 100
  view.step()
  assert.equal(view.scroller.scrollTop, 104)
  view.layout.cancel()
  assert.equal(view.frames.size, 0)
})

test('reduced motion keeps following functional without layout animation', (t) => {
  const view = scene(t, true)
  view.layout.capture()
  view.edge.top = 850
  view.layout.animate()
  view.step()
  assert.equal(view.edge.effects.length, 0)
  assert.equal(view.scroller.scrollTop, 104)
})

test('words on the same line do not restart motion or start a scroll loop', (t) => {
  const view = scene(t)
  view.layout.capture()
  view.layout.animate()
  assert.equal(view.frames.size, 0)
  assert.equal(view.edge.effects.length, 0)
  view.layout.capture()
  view.edge.top += 30
  view.layout.animate()
  const effect = view.edge.effects[0]
  view.edge.offset = -10
  view.layout.capture()
  view.layout.animate()
  assert.equal(effect.cancelled, false)
  assert.equal(view.edge.effects.length, 1)
})

test('line growth settles completely instead of keeping the page sliding', async (t) => {
  const view = scene(t)
  view.layout.capture()
  view.edge.top += 30
  view.footer.top += 30
  view.layout.animate()
  assert.equal(view.frames.size, 1)
  view.edge.effects[0].finish()
  view.footer.effects[0].finish()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(view.frames.size, 0)
  view.layout.capture()
  view.layout.animate()
  assert.equal(view.frames.size, 0)
  assert.equal(view.edge.effects.length, 1)
})
