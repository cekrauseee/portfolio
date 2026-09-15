import { motion } from '@/lib/motion'

// Measure structural blocks, not individual lines. Nested blocks receive only
// their local offset so parent and child motion never doubles the displacement.
export const expandedArticle = 'article:has(> h3 > button[aria-expanded=true])'
const blockSelector = ':scope > :not(script):not(style):not(footer), :scope > header > p, article'

export function readLocaleLayout(root: HTMLElement) {
  // Language selection anchors the footer in the viewport. Measure blocks
  // relative to that anchor so content above it moves by the actual visual
  // displacement after scroll stabilization, not just by document coordinates.
  const anchor = root.querySelector<HTMLElement>('footer') ?? root
  const originTop = anchor.getBoundingClientRect().top
  return new Map(
    [...root.querySelectorAll<HTMLElement>(blockSelector)].map((element) => {
      const rect = element.getBoundingClientRect()
      // Expanded content changes height immediately. Pin its lower boundary
      // to prevent the new text from sweeping over the following sections.
      // Reveal its translated contents together in their final geometry: moving
      // paragraphs independently puts new, taller copy into old, shorter gaps.
      const position = element.matches(expandedArticle) ? rect.bottom : rect.top
      return [element, position - originTop]
    }),
  )
}

export function animateLocaleLayout(
  previous: Map<HTMLElement, number>,
  current: Map<HTMLElement, number>,
) {
  const deltas = new Map<HTMLElement, number>()
  for (const [element, top] of current) {
    const before = previous.get(element)
    if (before !== undefined) {
      deltas.set(element, before - top)
    }
  }

  const animations: Animation[] = []
  for (const [element, delta] of deltas) {
    let ancestorDelta = 0
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (deltas.has(parent)) {
        ancestorDelta = deltas.get(parent)!
        break
      }
    }
    const offset = delta - ancestorDelta
    if (Math.abs(offset) < 0.5) {
      continue
    }
    animations.push(
      element.animate([{ translate: `0 ${offset}px` }, { translate: '0 0' }], {
        duration: motion.duration.settle,
        easing: motion.easing,
        composite: 'add',
      }),
    )
  }
  return animations
}
