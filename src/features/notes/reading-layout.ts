import type { ThemePreference } from '@/theme/config'
import { motion as motionTokens, easeMotion } from '@/lib/motion'

export function readingThemeOptions(
  base: ThemePreference,
  systemIsDark: boolean,
): readonly ThemePreference[] {
  return [
    base,
    base === 'system' ? (systemIsDark ? 'light' : 'dark') : base === 'dark' ? 'light' : 'dark',
  ]
}

type ReadingScroller = Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight' | 'scrollTo'>

const viewportCorrections = new WeakMap<ReadingScroller, { top: number }>()

/** Share deliberate layout corrections with already-mounted reading cameras. */
export function repositionReadingViewport(scroller: ReadingScroller, top: number) {
  scroller.scrollTo({ top, behavior: 'instant' })
  viewportCorrections.set(scroller, { top: scroller.scrollTop })
}

/** Own each camera frame so native user scrolls remain distinguishable. */
export function createReadingCamera(scroller: ReadingScroller) {
  let expectedTop = scroller.scrollTop
  let observedCorrection = viewportCorrections.get(scroller)
  let motion: { from: number; to: number; startedAt: number; duration: number } | null = null
  return {
    start(delta: number, now: number, reducedMotion: boolean) {
      const from = scroller.scrollTop
      const to = Math.min(
        Math.max(0, from + delta),
        Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      )
      expectedTop = from
      motion =
        Math.abs(delta) > 1
          ? { from, to, startedAt: now, duration: reducedMotion ? 0 : motionTokens.duration.page }
          : null
    },
    retarget(delta: number) {
      if (!motion) return
      motion.to = Math.min(
        Math.max(0, scroller.scrollTop + delta),
        Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      )
    },
    step(now: number) {
      if (!motion) return false
      const progress =
        motion.duration === 0 ? 1 : Math.min(1, (now - motion.startedAt) / motion.duration)
      const eased = easeMotion(progress)
      scroller.scrollTo({
        top: motion.from + (motion.to - motion.from) * eased,
        behavior: 'instant',
      })
      expectedTop = scroller.scrollTop
      if (progress === 1) {
        motion = null
        return true
      }
      return false
    },
    isMoving() {
      return motion !== null
    },
    isExpectedScroll() {
      const correction = viewportCorrections.get(scroller)
      if (correction && correction !== observedCorrection) {
        observedCorrection = correction
        if (Math.abs(scroller.scrollTop - correction.top) <= 1) {
          expectedTop = scroller.scrollTop
          motion = null
          return true
        }
      }
      return Math.abs(scroller.scrollTop - expectedTop) <= 1
    },
    cancel() {
      motion = null
      expectedTop = scroller.scrollTop
    },
  }
}
