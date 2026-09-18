import { animateLocaleLayout } from '@/i18n/locale-layout'
import { createStreamingScrollFollower, getViewportScroller } from '@/lib/viewport-scroll'

/** Reuse locale FLIP motion, measured in document space so following scroll isn't animated twice. */
export function createRoleFitRevealLayout(root: HTMLElement) {
  const page = root.closest<HTMLElement>('[data-locale-content]') ?? root
  const panel = root.closest<HTMLElement>('[data-collapsible-panel]')
  const edge = panel?.querySelector<HTMLElement>(':scope > div > div > button') ?? root
  const scroller = getViewportScroller(root)
  const follower = createStreamingScrollFollower(root)
  let previous: Map<HTMLElement, number> | undefined
  let previousHeight = 0
  let animations: Animation[] = []
  let settled: Promise<unknown> = Promise.resolve()
  let revision = 0
  let frame = 0
  let disposed = false

  function read() {
    const targets = new Set<HTMLElement>([
      ...page.querySelectorAll<HTMLElement>(':scope > :not(script):not(style)'),
      ...root.querySelectorAll<HTMLElement>('[data-fit-schedule]'),
      edge,
    ])
    return new Map(
      [...targets].map((element) => [
        element,
        element.getBoundingClientRect().top + scroller.scrollTop,
      ]),
    )
  }

  function follow() {
    if (disposed) return
    follower.follow(edge)
    frame = requestAnimationFrame(follow)
  }
  const controls = {
    capture() {
      previous = read()
      previousHeight = root.getBoundingClientRect().height
    },
    animate() {
      if (!previous || disposed) return
      if (Math.abs(root.getBoundingClientRect().height - previousHeight) < 0.5) {
        previous = undefined
        return
      }
      const currentRevision = ++revision
      // Sample the old on-screen positions before cancelling an interrupted move.
      animations.forEach((animation) => animation.cancel())
      const current = read()
      animations = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? []
        : animateLocaleLayout(previous, current)
      previous = undefined
      cancelAnimationFrame(frame)
      if (animations.length) frame = requestAnimationFrame(follow)
      else follower.follow(edge)
      settled = Promise.all(
        animations.map((animation) => animation.finished.catch(() => undefined)),
      )
      void settled.then(() => {
        if (disposed || currentRevision !== revision) return
        cancelAnimationFrame(frame)
        follower.follow(edge)
      })
    },
    finish() {
      void settled.then(() => controls.cancel())
    },
    cancel() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      follower.cancel()
      animations.forEach((animation) => animation.cancel())
    },
  }
  return controls
}
