import type { CSSProperties } from 'react'

const curve = [0.2, 0, 0, 1] as const

/** Shared by CSS, Web Animations and scroll controllers. See docs/motion.md. */
export const motion = {
  duration: { feedback: 150, settle: 180, control: 300, page: 360 },
  easing: `cubic-bezier(${curve.join(', ')})`,
  distance: { enter: 8, exit: 12, context: 24 },
  stagger: { item: 25, section: 90, footer: 240 },
  pressScale: 0.96,
  loadingCycle: 1800,
  icon: { scale: 0.25, blur: 4 },
} as const

// Render on <html> so the same values are available before hydration and in portals.
export const motionStyles: CSSProperties & Record<`--motion-${string}`, string | number> = {
  '--motion-loading-cycle': `${motion.loadingCycle}ms`,
  '--motion-feedback': `${motion.duration.feedback}ms`,
  '--motion-settle': `${motion.duration.settle}ms`,
  '--motion-control': `${motion.duration.control}ms`,
  '--motion-page': `${motion.duration.page}ms`,
  '--motion-easing': motion.easing,
  '--motion-rise': `${motion.distance.enter}px`,
  '--motion-exit': `${motion.distance.exit}px`,
  '--motion-context': `${motion.distance.context}px`,
  '--motion-section-delay': `${motion.stagger.section}ms`,
  '--motion-footer-delay': `${motion.stagger.footer}ms`,
  '--motion-press-scale': motion.pressScale,
  '--motion-icon-scale': motion.icon.scale,
  '--motion-icon-blur': `${motion.icon.blur}px`,
}

/** Sample the same CSS curve for frame-driven scrolling, without overshoot. */
export function easeMotion(progress: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  const sample = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3
  let low = 0
  let high = 1
  for (let step = 0; step < 16; step++) {
    const t = (low + high) / 2
    if (sample(t, curve[0], curve[2]) < progress) low = t
    else high = t
  }
  return sample((low + high) / 2, curve[1], curve[3])
}
