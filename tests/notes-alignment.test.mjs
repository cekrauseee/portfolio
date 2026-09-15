import assert from 'node:assert/strict'
import test from 'node:test'
import {
  activeUnitIndex,
  clampSeekTime,
  decodeAlignmentArtifact,
  formatAudioTime,
  normalizePlaybackRate,
  unitPlaybackState,
} from '../src/features/notes/alignment.ts'

function artifact(overrides = {}) {
  return {
    schemaVersion: 1,
    offsetConvention: 'utf-16-code-units',
    alignmentMethod: 'whisper-1-transcription-word-timestamps',
    noteId: 'note',
    locale: 'ja',
    spokenText: '考えを 話す',
    durationMs: 2_000,
    units: [
      { text: '考えを', startMs: 0, endMs: 700, startChar: 0, endChar: 3 },
      { text: '話す', startMs: 800, endMs: 1_500, startChar: 4, endChar: 6 },
    ],
    chunks: [],
    ...overrides,
  }
}

test('alignment validates UTF-16 offsets and supports Japanese units without whitespace assumptions', () => {
  const decoded = decodeAlignmentArtifact(artifact(), {
    noteId: 'note',
    locale: 'ja',
    spokenText: '考えを 話す',
  })
  assert.equal(decoded.units[0].text, '考えを')
  assert.equal(activeUnitIndex(decoded.units, 300), 0)
  assert.equal(activeUnitIndex(decoded.units, 900), 1)
  assert.equal(unitPlaybackState(decoded.units[0], 1_600), 'said')
  assert.equal(unitPlaybackState(decoded.units[1], 300), 'upcoming')
})

test('English, Portuguese, and Japanese alignments must cover every significant source span', () => {
  const cases = [
    {
      locale: 'en',
      text: 'hello, brave world.',
      units: [
        {
          text: 'hello, brave',
          startMs: 0,
          endMs: 700,
          startChar: 0,
          endChar: 12,
        },
        {
          text: ' world.',
          startMs: 800,
          endMs: 1_500,
          startChar: 12,
          endChar: 19,
        },
      ],
    },
    {
      locale: 'pt',
      text: 'olá, mundo.',
      units: [
        { text: 'olá,', startMs: 0, endMs: 700, startChar: 0, endChar: 4 },
        {
          text: ' mundo.',
          startMs: 800,
          endMs: 1_500,
          startChar: 4,
          endChar: 11,
        },
      ],
    },
    {
      locale: 'ja',
      text: '考えを 話す。',
      units: [
        { text: '考えを', startMs: 0, endMs: 700, startChar: 0, endChar: 3 },
        {
          text: ' 話す。',
          startMs: 800,
          endMs: 1_500,
          startChar: 3,
          endChar: 7,
        },
      ],
    },
  ]
  for (const current of cases) {
    const decoded = decodeAlignmentArtifact(
      {
        ...artifact(),
        locale: current.locale,
        spokenText: current.text,
        units: current.units,
      },
      { noteId: 'note', locale: current.locale, spokenText: current.text },
    )
    assert.equal(decoded.units.length, 2)
    assert.throws(
      () =>
        decodeAlignmentArtifact(
          {
            ...artifact(),
            locale: current.locale,
            spokenText: current.text,
            units: current.units.slice(1),
          },
          { noteId: 'note', locale: current.locale, spokenText: current.text },
        ),
      /omits significant source text/,
    )
  }
})

test('alignment rejects source mismatches and duplicate units', () => {
  assert.throws(
    () =>
      decodeAlignmentArtifact(artifact({ spokenText: '違う' }), {
        noteId: 'note',
        locale: 'ja',
        spokenText: '考えを 話す',
      }),
    /does not match/,
  )
  assert.throws(
    () =>
      decodeAlignmentArtifact(artifact({ units: [...artifact().units, artifact().units[1]] }), {
        noteId: 'note',
        locale: 'ja',
        spokenText: '考えを 話す',
      }),
    /invalid unit|duplicate/,
  )
})

test('audio time formatting stays stable for seeking labels', () => {
  assert.equal(formatAudioTime(0), '0:00')
  assert.equal(formatAudioTime(65_432), '1:05')
})

test('seeking clamps to the real duration and playback rates stay within the control contract', () => {
  assert.equal(clampSeekTime(-10, 2_000), 0)
  assert.equal(clampSeekTime(2_400, 2_000), 2_000)
  assert.equal(clampSeekTime(900, 2_000), 900)
  assert.equal(normalizePlaybackRate(1.5), 1.5)
  assert.equal(normalizePlaybackRate(3), 1)
})

test('shared Whisper spans highlight together while partial overlaps are rejected', () => {
  const value = artifact({
    locale: 'en',
    spokenText: 'Made plans.',
    units: [
      { text: 'Made', startMs: 100, endMs: 900, startChar: 0, endChar: 4 },
      { text: 'plans', startMs: 100, endMs: 900, startChar: 5, endChar: 10 },
    ],
  })
  const expected = { noteId: 'note', locale: 'en', spokenText: 'Made plans.' }
  const decoded = decodeAlignmentArtifact(value, expected)
  assert.deepEqual(
    decoded.units.map((unit) => unitPlaybackState(unit, 500)),
    ['current', 'current'],
  )
  assert.throws(
    () =>
      decodeAlignmentArtifact(
        {
          ...value,
          units: [value.units[0], { ...value.units[1], startMs: 200 }],
        },
        expected,
      ),
    /invalid unit/,
  )
})

test('ElevenLabs artifacts use the existing word playback contract', () => {
  const value = artifact({
    alignmentMethod: 'elevenlabs-character-timestamps',
  })
  assert.equal(
    decodeAlignmentArtifact(value, {
      noteId: 'note',
      locale: 'ja',
      spokenText: value.spokenText,
    }).alignmentMethod,
    'elevenlabs-character-timestamps',
  )
})
