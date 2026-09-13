import assert from 'node:assert/strict'
import test from 'node:test'
import { easeMotion, motion } from '../src/lib/motion.ts'
import {
  accommodateReadyContent,
  createStreamingScrollFollower,
  releaseCollapsedViewport,
} from '../src/lib/viewport-scroll.ts'

function viewport(
  t,
  {
    top = 600,
    reduced = false,
    initialHeight = 0,
    closing = false,
    scrollTop = 0,
    scrollHeight = 1400,
    contentHeight = 400,
    switching = false,
    pending = false,
    collapsingHeightBefore = 0,
    mode = 'expand',
  } = {},
) {
  const events = new EventTarget()
  const animations = []
  const scrolls = []
  const animate = (frames, options) => {
    let finish
    const animation = {
      frames,
      options,
      cancelled: false,
      finished: new Promise((resolve) => {
        finish = resolve
      }),
      finish: () => finish(),
      cancel() {
        this.cancelled = true
        finish()
      },
    }
    animations.push(animation)
    return animation
  }
  let frame
  let notifyReady
  let observing = false
  let height = initialHeight
  let panelOffset = collapsingHeightBefore
  const pageProperties = new Map()
  const scroller = Object.assign(new EventTarget(), {
    dataset: {},
    style: {
      getPropertyValue: (name) => pageProperties.get(name) ?? '',
      setProperty: (name, value) => pageProperties.set(name, value),
      removeProperty: (name) => pageProperties.delete(name),
    },
    scrollTop,
    scrollHeight,
    clientHeight: 800,
    scrollTo({ top }) {
      scrolls.push({
        top,
        animations: animations.length,
        pageOpacity: this.style.getPropertyValue('--hash-page-opacity'),
      })
      this.scrollTop = top
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
  })
  const root = {
    isConnected: true,
    closest: () => scroller,
    getBoundingClientRect: () => ({ top: top - scroller.scrollTop }),
  }
  const properties = new Map()
  const panel = {
    dataset: {},
    style: {
      getPropertyValue: (name) => properties.get(name) ?? '',
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: (name) => properties.delete(name),
    },
    getAttribute: (name) => (name === 'aria-labelledby' ? 'section-trigger' : null),
    querySelector: () => pending,
    previousElementSibling: collapsingHeightBefore
      ? {
          previousElementSibling: null,
          getAttribute: (name) => (name === 'aria-hidden' ? 'true' : null),
          getBoundingClientRect: () => ({ height: collapsingHeightBefore }),
        }
      : null,
    firstElementChild: { firstElementChild: { offsetHeight: contentHeight, animate } },
    getBoundingClientRect: () => ({
      top: top + 20 + panelOffset - scroller.scrollTop,
      height: panel.dataset.hashOpening
        ? parseFloat(properties.get('--hash-panel-height'))
        : height,
    }),
  }
  const globals = {
    MutationObserver: class {
      constructor(callback) {
        notifyReady = callback
      }
      observe() {
        observing = true
      }
      disconnect() {
        observing = false
      }
    },
    document: { getElementById: () => ({ animate }) },
    window: Object.assign(events, { innerHeight: 800, matchMedia: () => ({ matches: reduced }) }),
    getComputedStyle: () => ({ overflowY: 'auto' }),
    matchMedia: () => ({ matches: reduced }),
    requestAnimationFrame: (callback) => {
      frame = callback
      return 1
    },
    cancelAnimationFrame: () => {
      frame = undefined
    },
  }
  let cancel
  t.after(() => cancel?.())
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }
  cancel = closing
    ? releaseCollapsedViewport(root, panel)
    : accommodateReadyContent(root, panel, switching, mode)
  return {
    scroller,
    events,
    animations,
    scrolls,
    panel,
    cancel: () => cancel(),
    step(time, nextHeight) {
      height = nextHeight
      const callback = frame
      frame = undefined
      callback?.(time)
    },
    ready() {
      pending = false
      if (observing) notifyReady()
    },
    shiftRoot(delta) {
      top += delta
    },
    shiftPanel(delta) {
      panelOffset += delta
    },
    pending: () => Boolean(frame),
  }
}

function streamingViewport(t, { edgeBottom = 850 } = {}) {
  const events = new EventTarget()
  const scroller = Object.assign(new EventTarget(), {
    scrollTop: 0,
    scrollHeight: 1600,
    clientHeight: 800,
    scrollTo({ top }) {
      this.scrollTop = top
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
  })
  const root = {
    isConnected: true,
    closest: () => scroller,
  }
  const edge = {
    isConnected: true,
    getBoundingClientRect: () => ({
      bottom: edgeBottom - scroller.scrollTop,
    }),
  }
  const globals = {
    window: Object.assign(events, { innerHeight: 800 }),
    getComputedStyle: () => ({ overflowY: 'auto' }),
  }
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }

  const follower = createStreamingScrollFollower(root)
  t.after(follower.cancel)
  return {
    edge,
    events,
    follower,
    scroller,
    grow(amount) {
      edgeBottom += amount
    },
  }
}

test('accommodation follows panel geometry, including interrupted expansion', (t) => {
  const view = viewport(t, { initialHeight: 100 })
  view.step(0, 100)
  assert.equal(view.scroller.scrollTop, 0)
  view.step(100, 250)
  assert.equal(view.scroller.scrollTop, 205)
  view.step(400, 400)
  assert.equal(view.scroller.scrollTop, 410)
  assert.equal(view.pending(), false)
})

test('fully visible actions stay still', (t) => {
  const view = viewport(t, { top: 100 })
  assert.equal(view.pending(), false)
  assert.equal(view.scroller.scrollTop, 0)
})

test('reduced motion accommodates immediately', (t) => {
  const view = viewport(t, { reduced: true })
  view.step(0, 400)
  assert.equal(view.scroller.scrollTop, 410)
  assert.equal(view.pending(), false)
})

for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'resize']) {
  test(`${event} cancels accommodation`, (t) => {
    const view = viewport(t)
    view.events.dispatchEvent(new Event(event))
    assert.equal(view.pending(), false)
    assert.equal(view.scroller.scrollTop, 0)
  })
}

test('external scroll takes priority', (t) => {
  const view = viewport(t)
  view.scroller.scrollTop = 50
  view.step(0, 200)
  assert.equal(view.scroller.scrollTop, 50)
  assert.equal(view.pending(), false)
})

test('closing releases only scroll that will no longer fit', (t) => {
  const view = viewport(t, {
    closing: true,
    initialHeight: 400,
    scrollTop: 500,
  })
  view.step(0, 400)
  assert.equal(view.scroller.scrollTop, 500)
  view.step(100, 200)
  assert.equal(view.scroller.scrollTop, 350)
  view.step(400, 0)
  assert.equal(view.scroller.scrollTop, 200)
  assert.equal(view.pending(), false)
})

test('closing leaves valid scroll positions alone', (t) => {
  const view = viewport(t, {
    closing: true,
    initialHeight: 400,
    scrollTop: 100,
  })
  assert.equal(view.pending(), false)
  assert.equal(view.scroller.scrollTop, 100)
})

test('browser clamping at the page end does not cancel closing', (t) => {
  const view = viewport(t, {
    closing: true,
    initialHeight: 400,
    scrollTop: 600,
  })
  view.step(0, 400)
  view.scroller.scrollHeight = 1300
  view.scroller.scrollTop = 500
  view.step(100, 300)
  assert.equal(view.pending(), true)
  assert.equal(view.scroller.scrollTop, 500)
  view.scroller.scrollHeight = 1000
  view.scroller.scrollTop = 200
  view.step(400, 0)
  assert.equal(view.scroller.scrollTop, 200)
  assert.equal(view.pending(), false)
})

test('long project content brings its heading near the viewport top', (t) => {
  const view = viewport(t, { contentHeight: 1000 })
  view.step(0, 0)
  view.step(400, 1000)
  assert.equal(view.scroller.scrollTop, 576)
})

test('switching accounts for the previous sibling shrinking above the heading', (t) => {
  const view = viewport(t, { switching: true })
  view.step(0, 0)
  view.shiftRoot(-50)
  view.step(100, 200)
  assert.equal(view.scroller.scrollTop, 155)
  view.step(200, 400)
  assert.equal(view.pending(), true)
  view.shiftRoot(-50)
  view.step(400, 400)
  assert.equal(view.scroller.scrollTop, 310)
  assert.equal(view.pending(), false)
})

test('an already visible next item retains its heading during sibling collapse', (t) => {
  const view = viewport(t, { top: 600, scrollTop: 500, switching: true })
  view.step(0, 0)
  view.shiftRoot(-100)
  view.step(400, 400)
  assert.equal(view.scroller.scrollTop, 400)
})

test('switching actions measures after an earlier panel collapses', (t) => {
  const view = viewport(t, { switching: true, collapsingHeightBefore: 400 })
  view.step(0, 0)
  view.shiftPanel(-400)
  view.step(400, 400)
  assert.equal(view.scroller.scrollTop, 410)
})

test('streaming follows only the growing edge below the viewport', (t) => {
  const view = streamingViewport(t)
  view.follower.follow(view.edge)
  assert.equal(view.scroller.scrollTop, 74)

  view.grow(100)
  view.follower.follow(view.edge)
  assert.equal(view.scroller.scrollTop, 174)

  view.follower.follow(view.edge)
  assert.equal(view.scroller.scrollTop, 174)
})

for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'resize']) {
  test(`${event} gives the visitor control during streaming`, (t) => {
    const view = streamingViewport(t)
    view.events.dispatchEvent(new Event(event))
    view.follower.follow(view.edge)
    assert.equal(view.scroller.scrollTop, 0)
  })
}

test('external scroll cancels streaming follow', (t) => {
  const view = streamingViewport(t)
  view.scroller.scrollTop = 40
  view.scroller.dispatchEvent(new Event('scroll'))
  view.follower.follow(view.edge)
  assert.equal(view.scroller.scrollTop, 40)
})

test('first async opening measures loaded content even after a slow response', (t) => {
  const view = viewport(t, { pending: true, contentHeight: 1000 })
  view.step(1000, 100)
  assert.equal(view.scroller.scrollTop, 0)
  view.ready()
  view.step(1100, 1000)
  view.step(1500, 1000)
  assert.equal(view.scroller.scrollTop, 576)
})
for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'resize']) {
  test(`${event} prevents delayed content from recentering`, (t) => {
    const view = viewport(t, { pending: true, contentHeight: 1000 })
    view.events.dispatchEvent(new Event(event))
    view.ready()
    view.step(1000, 1000)
    assert.equal(view.scroller.scrollTop, 0)
    assert.equal(view.pending(), false)
  })
}
test('external scroll cancels pending first-load accommodation', (t) => {
  const view = viewport(t, { pending: true })
  view.scroller.scrollTop = 80
  view.scroller.dispatchEvent(new Event('scroll'))
  view.ready()
  view.step(1000, 400)
  assert.equal(view.scroller.scrollTop, 80)
})

test('hash navigation moves the page and expands the item on the same curve without an initial jump', (t) => {
  const view = viewport(t, { mode: 'hash', top: 550, scrollHeight: 3000 })
  assert.deepEqual(view.scrolls, [])
  assert.deepEqual(view.animations, [])
  assert.equal(view.pending(), true)
  view.step(0, 0)
  assert.equal(view.scroller.scrollTop, 0)
  assert.equal(view.panel.getBoundingClientRect().height, 0)
  for (const time of [90, 180, 270]) {
    view.step(time, 0)
    const progress = easeMotion(time / motion.duration.page)
    assert.ok(Math.abs(view.scroller.scrollTop - 360 * progress) < 0.001)
    assert.ok(Math.abs(view.panel.getBoundingClientRect().height - 400 * progress) < 0.001)
    assert.ok(view.scroller.scrollTop > 0 && view.scroller.scrollTop < 360)
  }
  view.step(motion.duration.page, 400)
  assert.equal(view.scroller.scrollTop, 360)
  assert.equal(view.panel.dataset.hashOpening, undefined)
  assert.equal(view.panel.style.getPropertyValue('--hash-panel-height'), '')
  assert.equal(view.pending(), false)
})

test('a hash section already in view expands in place without moving the page', (t) => {
  const view = viewport(t, { mode: 'hash', top: 100 })
  view.step(0, 0)
  view.step(180, 0)
  assert.ok(view.panel.getBoundingClientRect().height > 0)
  view.step(motion.duration.page, 400)
  assert.ok(view.scrolls.every(({ top }) => top === 0))
  assert.deepEqual(view.animations, [])
})

test('reduced-motion hash navigation reaches the final position without a motion controller', (t) => {
  const view = viewport(t, { mode: 'hash', top: 1000, scrollHeight: 3000, reduced: true })
  assert.equal(view.scroller.scrollTop, 810)
  assert.equal(view.panel.dataset.hashOpening, undefined)
  assert.deepEqual(view.animations, [])
  assert.equal(view.pending(), false)
})

test('hash navigation waits for async content and then moves continuously from the current viewport', (t) => {
  const view = viewport(t, { mode: 'hash', top: 550, scrollHeight: 3000, pending: true })
  assert.deepEqual(view.scrolls, [])
  view.ready()
  assert.equal(view.scroller.scrollTop, 0)
  view.step(0, 0)
  view.step(180, 0)
  assert.ok(view.scroller.scrollTop > 0 && view.scroller.scrollTop < 360)
  view.step(motion.duration.page, 400)
  assert.equal(view.scroller.scrollTop, 360)
})

test('input while a linked section loads prevents delayed navigation', (t) => {
  const view = viewport(t, { mode: 'hash', pending: true })
  view.events.dispatchEvent(new Event('wheel'))
  view.ready()
  assert.deepEqual(view.scrolls, [])
  assert.equal(view.pending(), false)
})

test('interrupting hash navigation stops scrolling and releases the panel to its normal layout', (t) => {
  const view = viewport(t, { mode: 'hash', top: 1000, scrollHeight: 3000 })
  view.step(0, 0)
  view.step(90, 0)
  const current = view.scroller.scrollTop
  view.events.dispatchEvent(new Event('wheel'))
  view.cancel()
  view.step(motion.duration.page, 400)
  assert.equal(view.scroller.scrollTop, current)
  assert.equal(view.panel.dataset.hashOpening, undefined)
  assert.equal(view.panel.style.getPropertyValue('--hash-panel-height'), '')
  assert.equal(view.pending(), false)
})

test('hash navigation follows siblings collapsing above the destination without a final correction', (t) => {
  const view = viewport(t, { mode: 'hash', top: 1000, scrollHeight: 3000 })
  view.step(0, 0)
  view.shiftRoot(-100)
  view.step(180, 0)
  view.shiftRoot(-100)
  view.step(motion.duration.page, 400)
  assert.equal(view.scroller.scrollTop, 610)
  assert.equal(view.pending(), false)
})

test('external scrolling takes control from hash navigation', (t) => {
  const view = viewport(t, { mode: 'hash', top: 1000, scrollHeight: 3000 })
  view.step(0, 0)
  view.step(90, 0)
  view.scroller.scrollTop = 175
  view.step(180, 0)
  assert.equal(view.scroller.scrollTop, 175)
  assert.equal(view.pending(), false)
  assert.equal(view.panel.dataset.hashOpening, undefined)
})

test('a distant hash starts near the item and reveals the whole page with its expansion', (t) => {
  const view = viewport(t, { mode: 'hash', top: 20000, scrollHeight: 30000 })
  const target = 19810
  const start = target - motion.distance.context
  assert.equal(view.scroller.scrollTop, start)
  assert.equal(view.scrolls[0].pageOpacity, '0')
  assert.equal(view.scroller.dataset.hashArriving, 'true')
  assert.deepEqual(view.animations, [])
  view.step(0, 0)
  assert.equal(view.scroller.scrollTop, start)
  assert.equal(view.panel.getBoundingClientRect().height, 0)
  view.step(180, 0)
  const progress = easeMotion(0.5)
  assert.ok(
    Math.abs(view.scroller.scrollTop - (start + motion.distance.context * progress)) < 0.001,
  )
  assert.ok(Math.abs(view.panel.getBoundingClientRect().height - 400 * progress) < 0.001)
  assert.equal(Number(view.scroller.style.getPropertyValue('--hash-page-opacity')), progress)
  view.step(motion.duration.page, 400)
  assert.equal(view.scroller.scrollTop, target)
  assert.equal(view.scroller.dataset.hashArriving, undefined)
  assert.equal(view.scroller.style.getPropertyValue('--hash-page-opacity'), '')
})

test('a distant destination above the viewport also uses a short local approach', (t) => {
  const view = viewport(t, { mode: 'hash', top: 1000, scrollTop: 19000, scrollHeight: 30000 })
  assert.equal(view.scroller.scrollTop, 810 + motion.distance.context)
  view.step(0, 0)
  view.step(motion.duration.page, 400)
  assert.equal(view.scroller.scrollTop, 810)
})

test('interrupting a distant entrance immediately restores page visibility', (t) => {
  const view = viewport(t, { mode: 'hash', top: 20000, scrollHeight: 30000 })
  view.events.dispatchEvent(new Event('wheel'))
  assert.equal(view.scroller.dataset.hashArriving, undefined)
  assert.equal(view.scroller.style.getPropertyValue('--hash-page-opacity'), '')
  assert.equal(view.panel.dataset.hashOpening, undefined)
  assert.equal(view.pending(), false)
})
