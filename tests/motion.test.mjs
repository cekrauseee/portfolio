import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { motion, motionStyles, easeMotion } from '../src/lib/motion.ts'

const root = fileURLToPath(new URL('../src/', import.meta.url))
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx|css)$/.test(path) ? [path] : []
  })
}

test('CSS receives the JavaScript motion timings in the initial HTML', () => {
  const html = renderToStaticMarkup(createElement('html', { style: motionStyles }))
  for (const [name, duration] of Object.entries(motion.duration)) {
    assert.ok(duration > 0 && duration <= 400)
    assert.ok(html.includes(`--motion-${name}:${duration}ms`))
  }
  assert.ok(html.includes(`--motion-easing:${motion.easing}`))
  assert.ok(motion.duration.feedback < motion.duration.control)
  assert.ok(motion.duration.settle < motion.duration.page)
  assert.ok(motion.stagger.footer < motion.duration.page)
})

test('the scroll curve has exact endpoints and advances without overshooting', () => {
  assert.equal(easeMotion(-1), 0)
  assert.equal(easeMotion(0), 0)
  assert.equal(easeMotion(1), 1)
  assert.equal(easeMotion(2), 1)
  let previous = 0
  for (let step = 1; step < 100; step++) {
    const value = easeMotion(step / 100)
    assert.ok(value > previous && value < 1)
    previous = value
  }
})

test('frame-driven scrolling samples the same cubic Bezier used by CSS', () => {
  const [x1, y1, x2, y2] = motion.easing.match(/[\d.]+/g).map(Number)
  for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const x = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3
    const y = 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3
    assert.ok(Math.abs(easeMotion(x) - y) < 0.0001)
  }
})

test('platform motion uses shared durations and easing instead of local presets', () => {
  for (const path of sourceFiles(root)) {
    if (path.endsWith('/lib/motion.ts')) continue
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /\bduration:\s*[1-9]\d*|\beasing:\s*['"`]/, path)
    assert.doesNotMatch(source, /\bduration-(?:\[)?\d|\bease-(?:in|out|linear)\b/, path)
    if (path.endsWith('.css')) {
      assert.doesNotMatch(
        source,
        /(?:animation|transition)[^:;{}]*:[^;{}]*\b[1-9]\d*(?:ms|s)\b/,
        path,
      )
    }
    for (const [variable] of source.matchAll(/--motion-[a-z-]+/g)) {
      if (variable === '--motion-entry-delay') continue // Inherited per-item stagger.
      assert.ok(variable in motionStyles, `${variable} is missing from the initial HTML (${path})`)
    }
  }
})
