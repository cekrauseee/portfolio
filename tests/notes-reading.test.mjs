import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import { unitPlaybackState } from '../src/features/notes/alignment.ts'
import { normalizeNoteForSpeech } from '../src/content/notes-markdown.ts'
import {
  createReadingScrollGuard,
  createReadingReturnTimer,
  rehypeNoteAlignment,
  readingScrollDelta,
  readingFocusScrollDelta,
  canFollowNarration,
  rehypeNoteTextPositions,
  noteUnitForRange,
} from '../src/features/notes/reading.ts'

function alignmentFor(markdown, locale = 'pt') {
  const spokenText = normalizeNoteForSpeech(markdown, locale)
  const units = Array.from(new Intl.Segmenter(locale, { granularity: 'word' }).segment(spokenText))
    .filter((part) => part.isWordLike)
    .map((part, index) => ({
      text: part.segment,
      startChar: part.index,
      endChar: part.index + part.segment.length,
      startMs: index * 200,
      endMs: (index + 1) * 200,
    }))
  return { spokenText, units }
}

function render(markdown, alignment) {
  return renderToStaticMarkup(
    createElement(ReactMarkdown, { rehypePlugins: [[rehypeNoteAlignment, alignment]] }, markdown),
  )
}

test('real Markdown rendering marks every spoken word through nested formatting and repeated text', () => {
  const markdown =
    '# Olá\n\nOlá **mundo** e [mundo](https://example.com).\n\n> Mais *uma* nota.\n\n- Item\n- Outro\n\n`código`\n\n```\nconst valor = 1\n```'
  const alignment = alignmentFor(markdown)
  const html = render(markdown, alignment)
  const indices = [...html.matchAll(/data-note-unit="(\d+)"/g)].map((match) => Number(match[1]))
  assert.deepEqual(
    [...new Set(indices)],
    alignment.units.map((_, index) => index),
  )
  assert.match(html, /<strong><span data-note-unit="2">mundo<\/span><\/strong>/)
  assert.match(html, /<a href="https:\/\/example.com"><span/)
  assert.match(html, /<code><span/)
})

test('words split by inline formatting retain their shared timestamp', () => {
  const html = render('uma pala**vra**.', alignmentFor('uma pala**vra**.'))
  assert.equal([...html.matchAll(/data-note-unit="1"/g)].length, 3)
  assert.match(html, /<strong><span data-note-unit="1">vra<\/span><\/strong>/)
})

test('image alternative text advances offsets without corrupting subsequent repeated words', () => {
  const markdown = '![nota](https://example.com/image.png) nota'
  const html = render(markdown, alignmentFor(markdown))
  assert.match(html, /alt="nota"/)
  assert.match(html, /data-note-unit="1">nota/)
  assert.doesNotMatch(html, /data-note-unit="0"/)
})

test('Japanese offsets and text-only rendering remain intact', () => {
  const markdown = '考えを話す。'
  const alignment = alignmentFor(markdown, 'ja')
  assert.equal(
    [...render(markdown, alignment).matchAll(/data-note-unit=/g)].length,
    alignment.units.length,
  )
  assert.equal(render('**Uma nota**', null), '<p><strong>Uma nota</strong></p>')
})

test('whole words become current at their timestamp and stay said after completion', () => {
  const unit = { startMs: 1000, endMs: 1400 }
  assert.equal(unitPlaybackState(unit, 999), 'upcoming')
  assert.equal(unitPlaybackState(unit, 1000), 'current')
  assert.equal(unitPlaybackState(unit, 1200), 'current')
  assert.equal(unitPlaybackState(unit, 1400), 'said')
  assert.equal(unitPlaybackState(unit, 1500), 'said')
  assert.equal(unitPlaybackState(unit, 0), 'upcoming')
})

test('reading follows an above-center band in window and nested scrollports', () => {
  assert.equal(readingScrollDelta(380, 0, 1000), 0)
  assert.equal(readingScrollDelta(390, 0, 1000), 0)
  assert.equal(readingScrollDelta(700, 0, 1000), 380)
  assert.equal(readingScrollDelta(100, 0, 1000), -220)
  assert.equal(readingScrollDelta(480, 100, 1000), 0)
  assert.equal(readingScrollDelta(800, 100, 1000), 380)
})

test('manual scrolling delays following for five seconds after the last movement', () => {
  const guard = createReadingScrollGuard()
  assert.equal(guard.canFollow(0), true)
  guard.manual(100)
  assert.equal(guard.canFollow(5099), false)
  assert.equal(guard.canFollow(5100), true)
  guard.scroll(5200)
  assert.equal(guard.canFollow(10199), false)
  assert.equal(guard.canFollow(10200), true)
})

test('scrollbar drags keep following suspended until five seconds after release', () => {
  const guard = createReadingScrollGuard()
  guard.hold(100)
  assert.equal(guard.canFollow(20000), false)
  guard.release(20000)
  assert.equal(guard.canFollow(24999), false)
  assert.equal(guard.canFollow(25000), true)
})

test('automatic scrolling does not reset idle time and manual input interrupts it', () => {
  const guard = createReadingScrollGuard()
  guard.startAutomatic()
  guard.scroll(100)
  assert.equal(guard.canFollow(101), true)
  guard.manual(200)
  guard.scroll(300)
  assert.equal(guard.canFollow(5299), false)
  assert.equal(guard.canFollow(5300), true)
  guard.startAutomatic()
  guard.scroll(5400)
  guard.endAutomatic()
  assert.equal(guard.canFollow(5401), true)
})

test('punctuation inherits word timing even outside nested Markdown elements', () => {
  const markdown = '“Olá”, **mundo**! Depois...'
  const html = render(markdown, alignmentFor(markdown))
  assert.match(html, /data-note-unit="0">“Olá”,<\/span>/)
  assert.match(
    html,
    /<strong><span data-note-unit="1">mundo<\/span><\/strong><span data-note-unit="1">!<\/span>/,
  )
  assert.match(html, /data-note-unit="2">Depois\.\.\.<\/span>/)
})

test('an explicit play request bypasses the scroll grace period', () => {
  const guard = createReadingScrollGuard()
  guard.manual(1000)
  assert.equal(guard.canFollow(1001), false)
  guard.reset()
  assert.equal(guard.canFollow(1001), true)
})

test('idle return wakes without media events and restarts after each scroll', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const guard = createReadingScrollGuard()
  let returns = 0
  const idle = createReadingReturnTimer(
    guard,
    () => {
      returns += 1
    },
    Date.now,
  )
  guard.manual(Date.now())
  idle.restart()
  t.mock.timers.tick(4000)
  assert.equal(returns, 0)
  guard.manual(Date.now())
  idle.restart()
  t.mock.timers.tick(4999)
  assert.equal(returns, 0)
  t.mock.timers.tick(1)
  assert.equal(returns, 1)
  idle.dispose()
})

test('pausing preserves elapsed inactivity and closing cancels the pending return', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const guard = createReadingScrollGuard()
  let returns = 0
  const wake = () => {
    returns += 1
  }
  const playing = createReadingReturnTimer(guard, wake, Date.now)
  guard.manual(Date.now())
  playing.restart()
  t.mock.timers.tick(2000)
  playing.dispose()
  const paused = createReadingReturnTimer(guard, wake, Date.now)
  paused.restart()
  t.mock.timers.tick(2999)
  assert.equal(returns, 0)
  t.mock.timers.tick(1)
  assert.equal(returns, 1)
  guard.manual(Date.now())
  paused.restart()
  paused.dispose()
  t.mock.timers.tick(5000)
  assert.equal(returns, 1)
})

test('reading entry removes excess space above the header even when the word is already in its band', () => {
  assert.equal(readingScrollDelta(360, 0, 1100), 0)
  assert.equal(readingFocusScrollDelta(360, 180, 0, 1100), 132)
})

test('word following never pulls the opening header back down into empty space', () => {
  assert.equal(readingFocusScrollDelta(210, 48, 0, 1100), 0)
  assert.equal(readingFocusScrollDelta(210, 48, 0, 1100, true), 0)
  assert.equal(readingFocusScrollDelta(550, 48, 0, 1100), 198)
})

test('header placement adapts to small and nested viewports and falls back without a header', () => {
  assert.equal(readingFocusScrollDelta(200, 80, 0, 400), 72)
  assert.equal(readingFocusScrollDelta(300, 180, 100, 400), 72)
  assert.equal(readingFocusScrollDelta(100, undefined, 0, 1000), -220)
})

test('silent, paused, ended and failed narration never take over the reading viewport', () => {
  const audio = { paused: true, ended: false, error: null }
  assert.equal(canFollowNarration(false, audio), false)
  assert.equal(canFollowNarration(true, audio), false)
  assert.equal(canFollowNarration(true, null), false)
  audio.paused = false
  assert.equal(canFollowNarration(true, audio), true)
  assert.equal(canFollowNarration(false, audio), false)
  audio.ended = true
  assert.equal(canFollowNarration(true, audio), false)
  audio.ended = false
  audio.error = { code: 2 }
  assert.equal(canFollowNarration(true, audio), false)
})

test('server-rendered Markdown exposes source positions without waiting for audio timestamps', () => {
  const content = 'one **word**, then another.'
  const spokenText = normalizeNoteForSpeech(content, 'en')
  const html = renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        rehypePlugins: [[rehypeNoteTextPositions, { spokenText, locale: 'en' }]],
      },
      content,
    ),
  )
  assert.match(html, /data-note-start="0" data-note-end="3">one/)
  assert.match(html, /<strong><span data-note-start="4" data-note-end="8">word/)
  assert.match(html, /data-note-start="4" data-note-end="8">,/)
  assert.doesNotMatch(html, /data-note-unit=/)
})

test('server word positions bind to timing units even when one unit covers several words', () => {
  const units = [
    { startChar: 0, endChar: 8 },
    { startChar: 10, endChar: 14 },
  ]
  assert.equal(noteUnitForRange(units, 0, 3), 0)
  assert.equal(noteUnitForRange(units, 4, 8), 0)
  assert.equal(noteUnitForRange(units, 10, 14), 1)
  assert.equal(noteUnitForRange(units, 15, 22), -1)
})
