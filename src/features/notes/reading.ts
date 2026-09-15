import type { Element, Root, RootContent } from 'hast'
import type { AlignmentUnit } from './alignment'

/** Mark actual HAST text nodes: react-markdown components only receive elements. */
export function rehypeNoteAlignment(
  alignment: {
    spokenText: string
    units: readonly Pick<AlignmentUnit, 'startChar' | 'endChar'>[]
  } | null,
) {
  return (tree: Root) => {
    if (!alignment) return
    let cursor = 0
    function visit(parent: Root | Element) {
      parent.children = parent.children.flatMap((node): RootContent[] => {
        if (node.type === 'element') {
          if (node.tagName === 'img' && typeof node.properties.alt === 'string') {
            const start = alignment!.spokenText.indexOf(node.properties.alt, cursor)
            if (start >= 0) cursor = start + node.properties.alt.length
          } else {
            visit(node)
          }
          return [node]
        }
        if (node.type !== 'text' || !node.value.trim()) return [node]
        // Code blocks receive a trailing newline from remark-rehype.
        const value = node.value.trimEnd()
        const start = alignment!.spokenText.indexOf(value, cursor)
        if (start < 0) return [node]
        cursor = start + value.length
        const result: RootContent[] = []
        let position = 0
        alignment!.units.forEach((unit, index) => {
          const unitStart = index === 0 ? 0 : unit.startChar
          const nextStart = alignment!.units[index + 1]?.startChar ?? alignment!.spokenText.length
          const unitEnd =
            unit.endChar + alignment!.spokenText.slice(unit.endChar, nextStart).trimEnd().length
          if (unitEnd <= start || unitStart >= cursor) return
          const from = Math.max(unitStart, start) - start
          const to = Math.min(unitEnd, cursor) - start
          if (from > position)
            result.push({ type: 'text', value: node.value.slice(position, from) })
          result.push({
            type: 'element',
            tagName: 'span',
            properties: { 'data-note-unit': index },
            children: [{ type: 'text', value: node.value.slice(from, to) }],
          })
          position = to
        })
        if (position < node.value.length) {
          result.push({ type: 'text', value: node.value.slice(position) })
        }
        return result
      }) as typeof parent.children
    }
    visit(tree)
  }
}

/** A quiet band above center avoids moving the viewport for every word. */
export function readingScrollDelta(wordTop: number, viewportTop: number, viewportHeight: number) {
  const relativeTop = wordTop - viewportTop
  if (relativeTop >= viewportHeight * 0.26 && relativeTop <= viewportHeight * 0.4) return 0
  return relativeTop - viewportHeight * 0.32
}

/**
 * Keep the post header near the top while reading its opening. Once narration
 * advances, the active word can carry the header naturally out of view.
 */
export function readingFocusScrollDelta(
  wordTop: number,
  headerTop: number | undefined,
  viewportTop: number,
  viewportHeight: number,
  exact = false,
) {
  const wordDelta = exact
    ? wordTop - viewportTop - viewportHeight * 0.32
    : readingScrollDelta(wordTop, viewportTop, viewportHeight)
  if (headerTop === undefined) return wordDelta
  return Math.max(wordDelta, readingHeaderScrollDelta(headerTop, viewportTop, viewportHeight))
}

export function readingHeaderScrollDelta(
  headerTop: number,
  viewportTop: number,
  viewportHeight: number,
) {
  const inset = Math.min(48, Math.max(24, viewportHeight * 0.05))
  return headerTop - viewportTop - inset
}

/** Automatic scroll events never extend the visitor's five-second grace period. */
export function createReadingScrollGuard() {
  let lastManualAt = -Infinity
  let interacting = false
  let automatic = false
  return {
    reset() {
      lastManualAt = -Infinity
      interacting = false
      automatic = false
    },
    isAutomatic() {
      return automatic
    },
    manual(now: number) {
      lastManualAt = now
      automatic = false
    },
    hold(now: number) {
      interacting = true
      this.manual(now)
    },
    release(now: number) {
      if (interacting) this.manual(now)
      interacting = false
    },
    scroll(now: number) {
      if (!automatic) lastManualAt = now
    },
    startAutomatic() {
      automatic = true
    },
    endAutomatic() {
      automatic = false
    },
    remainingIdleMs(now: number) {
      return Math.max(0, 5000 - (now - lastManualAt))
    },
    canFollow(now: number) {
      return !interacting && now - lastManualAt >= 5000
    },
  }
}

/** Wake the reading camera after inactivity, independently of the media clock. */
export function createReadingReturnTimer(
  guard: ReturnType<typeof createReadingScrollGuard>,
  wake: () => void,
  now: () => number = () => performance.now(),
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    restart() {
      clearTimeout(timer)
      timer = setTimeout(wake, guard.remainingIdleMs(now()))
    },
    dispose() {
      clearTimeout(timer)
    },
  }
}

/** Silent reading owns its viewport; only active narration can follow words. */
export function canFollowNarration(
  isPlaying: boolean,
  audio: Pick<HTMLAudioElement, 'paused' | 'ended' | 'error'> | null,
) {
  return isPlaying && audio !== null && !audio.paused && !audio.ended && !audio.error
}

/** Render text positions on the server; timestamps can arrive later without reparsing Markdown. */
export function rehypeNoteTextPositions({
  spokenText,
  locale,
}: {
  spokenText: string
  locale: string
}) {
  const units = Array.from(new Intl.Segmenter(locale, { granularity: 'word' }).segment(spokenText))
    .filter((part) => part.isWordLike)
    .map((part) => ({ startChar: part.index, endChar: part.index + part.segment.length }))
  return (tree: Root) => {
    rehypeNoteAlignment({ spokenText, units })(tree)
    const visit = (parent: Root | Element) => {
      for (const node of parent.children) {
        if (node.type !== 'element') continue
        const index = node.properties['data-note-unit']
        if (node.tagName === 'span' && typeof index === 'number') {
          node.properties['data-note-start'] = units[index].startChar
          node.properties['data-note-end'] = units[index].endChar
          delete node.properties['data-note-unit']
        }
        visit(node)
      }
    }
    visit(tree)
  }
}

export function noteUnitForRange(units: readonly AlignmentUnit[], start: number, end: number) {
  return units.findIndex((unit) => unit.startChar <= start && unit.endChar >= end)
}
