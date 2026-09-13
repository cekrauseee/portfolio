import { motion } from './motion'

/** Animate the label only: the native button and its accessible name stay live. */
export function createButtonLabelMotion(container: HTMLElement, current: HTMLElement) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let previous: string | undefined
  let previousWidth = 0
  let previousState: string | boolean | undefined
  let animations: Animation[] = []

  function cancel() {
    for (const animation of animations) {
      animation.onfinish = null
      animation.cancel()
    }
    animations = []
  }

  function settle() {
    cancel()
    previousWidth = container.getBoundingClientRect().width
  }

  function update(text: string, state: string | boolean = text) {
    const fromWidth = animations.length ? container.getBoundingClientRect().width : previousWidth
    cancel()
    const toWidth = container.getBoundingClientRect().width
    const oldText = previous
    const stateChanged = previousState !== state
    previousState = state
    previous = text
    previousWidth = toWidth
    if (
      oldText === undefined ||
      oldText === text ||
      !stateChanged ||
      preference.matches ||
      !container.getClientRects().length ||
      !fromWidth ||
      !toWidth
    ) {
      return
    }

    const textOptions = { duration: motion.duration.feedback, easing: motion.easing }
    const enter = current.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(2px)',
          width: `${toWidth}px`,
          maxWidth: 'none',
        },
        {
          opacity: 1,
          transform: 'translateY(0)',
          width: `${toWidth}px`,
          maxWidth: 'none',
        },
      ],
      { ...textOptions, fill: 'forwards' },
    )
    const size = container.animate([{ width: `${fromWidth}px` }, { width: `${toWidth}px` }], {
      duration: motion.duration.settle,
      easing: motion.easing,
    })
    animations = [enter, size]
    size.onfinish = settle
  }

  preference.addEventListener('change', settle)
  window.addEventListener('resize', settle)
  return {
    update,
    dispose() {
      cancel()
      preference.removeEventListener('change', settle)
      window.removeEventListener('resize', settle)
    },
  }
}
