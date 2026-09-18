import { motion } from '@/lib/motion'

export const WORD_INTERVAL_MS = motion.duration.control / 4

/** Buffer only an unfinished word, then pace ready words while the network continues. */
export function createWordStream(
  onWord: (text: string) => void,
  onDone: () => void,
  reduced = false,
) {
  let pending = ''
  let visible = ''
  let ended = false
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  function schedule() {
    if (cancelled || timer !== undefined) return
    if (!ended && !/^\s*\S+\s/u.test(pending)) return
    timer = setTimeout(
      () => {
        timer = undefined
        if (cancelled) return
        const word = /^\s*\S+\s+/u.exec(pending)?.[0] ?? (ended ? pending : '')
        if (word) {
          pending = pending.slice(word.length)
          visible += word
          onWord(visible)
        }
        if (ended && !pending) {
          // Let the final word finish fading before Streamdown removes its animation spans.
          timer = setTimeout(
            () => {
              if (cancelled) return
              cancelled = true
              onDone()
            },
            reduced ? 0 : motion.duration.control,
          )
        } else schedule()
      },
      reduced ? 0 : WORD_INTERVAL_MS,
    )
  }

  return {
    push(delta: string) {
      if (!ended && !cancelled) {
        pending += delta
        schedule()
      }
    },
    finish() {
      ended = true
      schedule()
    },
    cancel() {
      cancelled = true
      clearTimeout(timer)
    },
  }
}
