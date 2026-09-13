import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canContinuePlayback,
  nextPlaybackRequest,
  prepareNoteAudio,
} from '../src/features/notes/audio.ts'

function fakeAudio() {
  return {
    src: '',
    preload: 'metadata',
    loads: 0,
    load() {
      this.loads += 1
    },
  }
}

test('retry restores the same source and a new load after a media failure', () => {
  const audio = fakeAudio()
  prepareNoteAudio(audio, 'https://notes.public.blob.vercel-storage.com/note/en.mp3')
  assert.equal(audio.src, 'https://notes.public.blob.vercel-storage.com/note/en.mp3')
  assert.equal(audio.preload, 'auto')
  assert.equal(audio.loads, 1)

  audio.src = ''
  prepareNoteAudio(audio, 'https://notes.public.blob.vercel-storage.com/note/en.mp3')
  assert.equal(audio.src, 'https://notes.public.blob.vercel-storage.com/note/en.mp3')
  assert.equal(audio.loads, 2)
})

test('closing or superseding a pending play request prevents it from resuming', () => {
  const token = { current: 0 }
  const pending = nextPlaybackRequest(token)
  nextPlaybackRequest(token)
  assert.equal(canContinuePlayback(pending, token.current, true), false)
  assert.equal(canContinuePlayback(token.current, token.current, false), false)
  assert.equal(canContinuePlayback(token.current, token.current, true), true)
})
