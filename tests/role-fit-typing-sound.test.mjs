import assert from 'node:assert/strict'
import test from 'node:test'
import { createStreamingTypingSound, typingSoundOptions } from '../src/lib/typing-sound.ts'

function fixture(unlock = async () => true) {
  const cues = []
  let visible = true
  let stops = 0
  let destroyed = 0
  const sound = createStreamingTypingSound(
    {
      unlock,
      play: (...args) => cues.push(args),
      stopAll: () => {
        stops++
      },
      destroy: async () => {
        destroyed++
      },
    },
    () => visible,
  )
  return {
    sound,
    cues,
    hide: () => {
      visible = false
    },
    show: () => {
      visible = true
    },
    stops: () => stops,
    destroyed: () => destroyed,
  }
}

test('Zen typing is bounded to one voice and only follows revealed words', async () => {
  assert.equal(typingSoundOptions.pack, 'zen')
  assert.equal(typingSoundOptions.maxVoices, 1)
  const view = fixture()
  view.sound.word()
  assert.equal(view.cues.length, 0)
  view.sound.start()
  await Promise.resolve()
  assert.equal(view.cues.length, 0)
  view.sound.word()
  view.sound.word()
  assert.deepEqual(view.cues, [
    ['typing', { retrigger: 'restart', volume: 0.3 }],
    ['typing', { retrigger: 'restart', volume: 0.3 }],
  ])
  view.sound.stop()
  view.sound.word()
  assert.equal(view.cues.length, 2)
})

test('hidden words are skipped without replaying a backlog on return', async () => {
  const view = fixture()
  view.sound.start()
  await Promise.resolve()
  view.sound.word()
  view.hide()
  view.sound.silence()
  view.sound.word()
  view.sound.word()
  assert.equal(view.cues.length, 1)
  view.show()
  assert.equal(view.cues.length, 1)
  view.sound.word()
  assert.equal(view.cues.length, 2)
  assert.ok(view.stops() >= 2)
})

test('blocked autoplay and late unlock cannot restart a cancelled stream', async () => {
  let resolveUnlock
  const view = fixture(
    () =>
      new Promise((resolve) => {
        resolveUnlock = resolve
      }),
  )
  view.sound.start()
  view.sound.word()
  view.sound.stop()
  resolveUnlock(true)
  await Promise.resolve()
  view.sound.word()
  assert.deepEqual(view.cues, [])
  const blocked = fixture(async () => false)
  blocked.sound.start()
  await Promise.resolve()
  blocked.sound.word()
  assert.deepEqual(blocked.cues, [])
})

test('unmount destroys the player once and ignores late words', async () => {
  const view = fixture()
  view.sound.start()
  await Promise.resolve()
  view.sound.dispose()
  view.sound.dispose()
  view.sound.start()
  view.sound.word()
  assert.equal(view.destroyed(), 1)
  assert.deepEqual(view.cues, [])
})
