import { motion } from '../src/lib/motion.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createReadingCamera,
  readingThemeOptions,
  repositionReadingViewport,
} from '../src/features/notes/reading-layout.ts'

test('reading theme keeps a system option with a dynamically opposite alternative', () => {
  assert.deepEqual(readingThemeOptions('system', false), ['system', 'dark'])
  assert.deepEqual(readingThemeOptions('system', true), ['system', 'light'])
  for (const systemDark of [true, false]) {
    assert.deepEqual(readingThemeOptions('light', systemDark), ['light', 'dark'])
    assert.deepEqual(readingThemeOptions('dark', systemDark), ['dark', 'light'])
  }
})

function scroller() {
  return {
    scrollTop: 100,
    scrollHeight: 2000,
    clientHeight: 800,
    scrollTo({ top, behavior }) {
      assert.equal(behavior, 'instant')
      this.scrollTop = top
    },
  }
}

test('camera moves smoothly, completes at its target, and recognizes its own scrolls', () => {
  const viewport = scroller()
  const camera = createReadingCamera(viewport)
  camera.start(400, 1000, false)
  assert.equal(camera.step(1000), false)
  assert.equal(viewport.scrollTop, 100)
  assert.equal(camera.step(1180), false)
  assert.ok(viewport.scrollTop > 100 && viewport.scrollTop < 500)
  assert.equal(camera.isExpectedScroll(), true)
  assert.equal(camera.step(1360), true)
  assert.equal(viewport.scrollTop, 500)
  assert.equal(camera.isMoving(), false)
})

test('native scrolling is recognized even during camera movement and cancellation leaves it alone', () => {
  const viewport = scroller()
  const camera = createReadingCamera(viewport)
  camera.start(400, 0, false)
  camera.step(120)
  viewport.scrollTop = 50
  assert.equal(camera.isExpectedScroll(), false)
  camera.cancel()
  assert.equal(camera.step(360), false)
  assert.equal(viewport.scrollTop, 50)
})

test('camera honors reduced motion and clamps targets to both page edges', () => {
  const viewport = scroller()
  const camera = createReadingCamera(viewport)
  camera.start(9999, 0, true)
  assert.equal(camera.step(0), true)
  assert.equal(viewport.scrollTop, 1200)
  camera.start(-9999, 100, true)
  camera.step(100)
  assert.equal(viewport.scrollTop, 0)
})

test('camera follows header reflow within the shared page transition duration', () => {
  const viewport = scroller()
  const camera = createReadingCamera(viewport)
  camera.start(400, 0, false)
  camera.step(140)
  camera.retarget(540 - viewport.scrollTop)
  assert.equal(camera.step(motion.duration.page), true)
  assert.equal(viewport.scrollTop, 540)
})

test('camera can use scroll space that opens during the focused layout transition', () => {
  const viewport = scroller()
  viewport.scrollTop = 1200
  const camera = createReadingCamera(viewport)
  camera.start(300, 0, false)
  viewport.scrollHeight += 500
  camera.retarget(300)
  camera.step(motion.duration.page)
  assert.equal(viewport.scrollTop, 1500)
})

test('locale correction replaces an in-flight camera target without hiding later manual scrolling', () => {
  const viewport = scroller()
  const camera = createReadingCamera(viewport)
  camera.start(500, 0, false)
  camera.step(100)
  repositionReadingViewport(viewport, 400)
  assert.equal(camera.isExpectedScroll(), true)
  assert.equal(camera.isMoving(), false)
  camera.step(motion.duration.page)
  assert.equal(viewport.scrollTop, 400)
  viewport.scrollTop = 430
  assert.equal(camera.isExpectedScroll(), false)
})

test('manual scroll arriving after a locale correction is not mistaken for the correction', () => {
  const viewport = scroller()
  const camera = createReadingCamera(viewport)
  repositionReadingViewport(viewport, 400)
  viewport.scrollTop = 420
  assert.equal(camera.isExpectedScroll(), false)
  assert.equal(camera.isExpectedScroll(), false)
})
