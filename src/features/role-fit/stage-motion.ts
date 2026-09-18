import { motion } from '@/lib/motion'
import { followPanelHeight, getViewportScroller } from '@/lib/viewport-scroll'

type Stage = 'form' | 'result'

/** Exchange two mounted panels at one stable top edge; only the wrapper changes height. */
export function createRoleFitStageMotion(
  container: HTMLElement,
  form: HTMLElement,
  result: HTMLElement,
  onSettled: (stage: Stage) => void,
) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let stage: Stage = 'form'
  let snapshot: { height: number; formOpacity: number; resultOpacity: number } | undefined
  let heightAnimation: Animation | undefined
  let fades: Animation[] = []
  let deadline = 0
  let targetHeight = 0
  let transitioning = false
  let stopFollowing = () => {}
  result.style.display = 'none'

  function stop() {
    if (heightAnimation) heightAnimation.onfinish = null
    heightAnimation?.cancel()
    heightAnimation = undefined
    fades.forEach((animation) => animation.cancel())
    fades = []
    stopFollowing()
    stopFollowing = () => {}
  }

  function settle() {
    stop()
    transitioning = false
    container.style.height = ''
    container.style.overflow = ''
    form.style.display = stage === 'form' ? '' : 'none'
    result.style.display = stage === 'result' ? '' : 'none'
    onSettled(stage)
  }

  function resize() {
    if (!transitioning) return
    const panel = stage === 'form' ? form : result
    const height = panel.getBoundingClientRect().height
    if (Math.abs(height - targetHeight) < 0.5) return
    const from = container.getBoundingClientRect().height
    if (heightAnimation) heightAnimation.onfinish = null
    heightAnimation?.cancel()
    targetHeight = height
    container.style.height = `${from}px`
    heightAnimation = container.animate([{ height: `${from}px` }, { height: `${height}px` }], {
      duration: Math.max(0, deadline - performance.now()),
      easing: motion.easing,
      fill: 'both',
    })
    heightAnimation.onfinish = settle
    stopFollowing()
    stopFollowing = () => {}
    // Shrinking may remove scroll space below the viewport. Release only that
    // space on the height animation's clock, without reframing the loading text.
    if (height < from && container.closest('[data-action-open="true"]')) {
      const scroller = getViewportScroller(container)
      const finalMax = Math.max(0, scroller.scrollHeight - from + height - scroller.clientHeight)
      stopFollowing = followPanelHeight(
        container,
        container,
        scroller,
        Math.min(scroller.scrollTop, finalMax),
        height,
      )
    }
  }
  const observer = new ResizeObserver(resize)
  observer.observe(form)
  observer.observe(result)
  const reduce = () => {
    if (preference.matches && transitioning) settle()
  }
  preference.addEventListener('change', reduce)

  return {
    capture() {
      snapshot = {
        height: container.getBoundingClientRect().height,
        formOpacity: Number(getComputedStyle(form).opacity),
        resultOpacity: Number(getComputedStyle(result).opacity),
      }
    },
    update(next: Stage) {
      if (next === stage) return
      const from = snapshot ?? {
        height: (stage === 'form' ? form : result).getBoundingClientRect().height,
        formOpacity: stage === 'form' ? 1 : 0,
        resultOpacity: stage === 'result' ? 1 : 0,
      }
      snapshot = undefined
      stop()
      form.style.display = ''
      result.style.display = ''
      stage = next
      if (preference.matches || typeof container.animate !== 'function') {
        settle()
        return
      }
      transitioning = true
      container.style.height = `${from.height}px`
      container.style.overflow = 'clip'
      const duration = motion.duration.page
      deadline = performance.now() + duration
      targetHeight = -1
      for (const [panel, opacity, selected] of [
        [form, from.formOpacity, next === 'form'],
        [result, from.resultOpacity, next === 'result'],
      ] as const) {
        fades.push(
          panel.animate([{ opacity }, { opacity: selected ? 1 : 0 }], {
            duration: selected ? motion.duration.control : motion.duration.feedback,
            easing: motion.easing,
            fill: 'both',
          }),
        )
      }
      resize()
    },
    isTransitioning: () => transitioning,
    dispose() {
      observer.disconnect()
      preference.removeEventListener('change', reduce)
      stop()
      transitioning = false
      container.style.height = ''
      container.style.overflow = ''
      form.style.display = ''
      result.style.display = ''
    },
  }
}
