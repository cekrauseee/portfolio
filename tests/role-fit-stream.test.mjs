import assert from 'node:assert/strict'
import test from 'node:test'
import {
  encodeFitStreamEvent,
  readFitStream,
  FitStreamError,
} from '../src/features/role-fit/stream.ts'
import { createWordStream, WORD_INTERVAL_MS } from '../src/features/role-fit/word-stream.ts'
import { motion } from '../src/lib/motion.ts'

function body(events) {
  const bytes = events.flatMap((event) => [...encodeFitStreamEvent(event)])
  return new ReadableStream({
    start(controller) {
      // Exercise splits inside JSON and multibyte UTF-8, not just between frames.
      bytes.forEach((byte) => controller.enqueue(Uint8Array.of(byte)))
      controller.close()
    },
  })
}

test('client consumes deltas across arbitrary byte boundaries', async () => {
  const received = []
  for await (const delta of readFitStream(
    body([
      { type: 'delta', delta: 'Experi' },
      { type: 'delta', delta: 'ência útil.\n\n' },
      { type: 'done' },
    ]),
  ))
    received.push(delta)
  assert.deepEqual(received, ['Experi', 'ência útil.\n\n'])
})

test('a truncated or failed stream never becomes a completed assessment', async () => {
  for (const events of [
    [{ type: 'delta', delta: 'Partial ' }],
    [
      { type: 'delta', delta: 'Partial ' },
      { type: 'error', error: { code: 'assessment_failed', operationId: 'test' } },
    ],
  ]) {
    await assert.rejects(async () => {
      for await (const delta of readFitStream(body(events))) assert.ok(delta)
    }, FitStreamError)
  }
})

test('word buffering reveals complete words while the network is still open', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const words = []
  let done = false
  const stream = createWordStream(
    (text) => words.push(text),
    () => {
      done = true
    },
  )
  stream.push('Experi')
  t.mock.timers.tick(WORD_INTERVAL_MS)
  assert.deepEqual(words, [])
  stream.push('ência prática ')
  t.mock.timers.tick(WORD_INTERVAL_MS)
  assert.deepEqual(words, ['Experiência '])
  t.mock.timers.tick(WORD_INTERVAL_MS)
  assert.deepEqual(words, ['Experiência ', 'Experiência prática '])
  assert.equal(done, false)
  stream.push('hoje.')
  t.mock.timers.tick(WORD_INTERVAL_MS)
  assert.equal(words.length, 2)
  stream.finish()
  t.mock.timers.tick(WORD_INTERVAL_MS)
  assert.equal(words.at(-1), 'Experiência prática hoje.')
  assert.equal(done, false)
  t.mock.timers.tick(motion.duration.control)
  assert.equal(done, true)
})

test('cancellation drops queued words and prevents late completion', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const words = []
  let done = false
  const stream = createWordStream(
    (text) => words.push(text),
    () => {
      done = true
    },
  )
  stream.push('One two three')
  stream.finish()
  stream.cancel()
  t.mock.timers.tick(1000)
  assert.deepEqual(words, [])
  assert.equal(done, false)
})
