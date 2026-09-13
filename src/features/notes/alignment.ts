import type { NoteLocale } from '@/content/notes'

export type AlignmentUnit = {
  text: string
  startMs: number
  endMs: number
  startChar: number
  endChar: number
}

export type AlignmentArtifact = {
  schemaVersion: 1
  offsetConvention: 'utf-16-code-units'
  alignmentMethod: 'elevenlabs-character-timestamps' | 'whisper-1-transcription-word-timestamps'
  noteId: string
  locale: NoteLocale
  spokenText: string
  durationMs: number
  units: AlignmentUnit[]
  chunks: unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function significantSourceSpans(text: string, locale: NoteLocale) {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
  return Array.from(segmenter.segment(text))
    .filter((segment) => segment.isWordLike)
    .map((segment) => ({
      start: segment.index,
      end: segment.index + segment.segment.length,
    }))
}

function validateSourceCoverage(
  units: readonly AlignmentUnit[],
  spokenText: string,
  locale: NoteLocale,
) {
  const sourceSpans = significantSourceSpans(spokenText, locale)
  if (sourceSpans.length === 0) {
    throw new Error('the narration source has no significant text')
  }
  let sourceIndex = 0
  for (const unit of units) {
    const overlaps = sourceSpans.filter(
      (span) => span.start < unit.endChar && span.end > unit.startChar,
    )
    if (overlaps.length === 0 || overlaps[0] !== sourceSpans[sourceIndex]) {
      throw new Error('the narration alignment omits significant source text')
    }
    if (overlaps.some((span) => span.start < unit.startChar || span.end > unit.endChar)) {
      throw new Error('the narration alignment splits a significant source unit')
    }
    sourceIndex += overlaps.length
  }
  if (sourceIndex !== sourceSpans.length) {
    throw new Error('the narration alignment omits significant source text')
  }
}

export function decodeAlignmentArtifact(
  value: unknown,
  expected: { noteId: string; locale: NoteLocale; spokenText: string },
): AlignmentArtifact {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.offsetConvention !== 'utf-16-code-units' ||
    (value.alignmentMethod !== 'elevenlabs-character-timestamps' &&
      value.alignmentMethod !== 'whisper-1-transcription-word-timestamps') ||
    value.noteId !== expected.noteId ||
    value.locale !== expected.locale ||
    value.spokenText !== expected.spokenText ||
    typeof value.durationMs !== 'number' ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs <= 0 ||
    !Array.isArray(value.units) ||
    !Array.isArray(value.chunks)
  ) {
    throw new Error('the narration alignment does not match this note')
  }
  const durationMs = value.durationMs
  const rawUnits = value.units
  const chunks = value.chunks
  if (typeof durationMs !== 'number' || !Array.isArray(rawUnits) || !Array.isArray(chunks)) {
    throw new Error('the narration alignment does not match this note')
  }

  let previousStartMs = -1
  let previousEndMs = 0
  let previousEndChar = 0
  const seenSpans = new Set<string>()
  const units = rawUnits.map((unit, index) => {
    if (!isRecord(unit)) {
      throw new Error(`the narration alignment contains an invalid unit at ${index}`)
    }
    const text = unit.text
    const startChar = unit.startChar
    const endChar = unit.endChar
    const startMs = unit.startMs
    const endMs = unit.endMs
    if (
      typeof text !== 'string' ||
      typeof startChar !== 'number' ||
      typeof endChar !== 'number' ||
      typeof startMs !== 'number' ||
      typeof endMs !== 'number' ||
      !Number.isInteger(startChar) ||
      !Number.isInteger(endChar) ||
      !Number.isInteger(startMs) ||
      !Number.isInteger(endMs) ||
      startChar < previousEndChar ||
      endChar <= startChar ||
      endChar > expected.spokenText.length ||
      startMs < 0 ||
      endMs <= startMs ||
      endMs > durationMs + 50 ||
      (startMs + 1 < previousEndMs && !(startMs === previousStartMs && endMs === previousEndMs)) ||
      expected.spokenText.slice(startChar, endChar) !== text
    ) {
      throw new Error(`the narration alignment contains an invalid unit at ${index}`)
    }
    const span = `${startChar}:${endChar}`
    if (seenSpans.has(span)) {
      throw new Error('the narration alignment contains duplicate units')
    }
    seenSpans.add(span)
    previousStartMs = startMs
    previousEndMs = endMs
    previousEndChar = endChar
    return {
      text,
      startMs,
      endMs,
      startChar,
      endChar,
    }
  })

  if (units.length === 0) {
    throw new Error('the narration alignment has no timed units')
  }
  validateSourceCoverage(units, expected.spokenText, expected.locale)
  return {
    schemaVersion: 1,
    offsetConvention: 'utf-16-code-units',
    alignmentMethod: value.alignmentMethod,
    noteId: expected.noteId,
    locale: expected.locale,
    spokenText: expected.spokenText,
    durationMs,
    units,
    chunks,
  }
}

export type UnitPlaybackState = 'upcoming' | 'current' | 'said'

export const NOTE_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const

export function unitPlaybackState(unit: AlignmentUnit, currentTimeMs: number): UnitPlaybackState {
  if (currentTimeMs >= unit.endMs) {
    return 'said'
  }
  if (currentTimeMs >= unit.startMs) {
    return 'current'
  }
  return 'upcoming'
}

export function activeUnitIndex(units: readonly AlignmentUnit[], currentTimeMs: number) {
  return units.findIndex((unit) => currentTimeMs >= unit.startMs && currentTimeMs < unit.endMs)
}

export function formatAudioTime(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function clampSeekTime(milliseconds: number, durationMs: number) {
  if (!Number.isFinite(milliseconds) || !Number.isFinite(durationMs)) {
    return 0
  }
  return Math.min(Math.max(milliseconds, 0), Math.max(durationMs, 0))
}

export function normalizePlaybackRate(value: number) {
  return NOTE_PLAYBACK_RATES.includes(value as (typeof NOTE_PLAYBACK_RATES)[number]) ? value : 1
}
