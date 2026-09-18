import type { UISFXOptions, UISFXPlayer } from 'uisfx'
import { soundLevels } from '@/lib/sound-levels'

export const typingSoundOptions = {
  pack: 'zen',
  volume: soundLevels.typing.master,
  maxVoices: 1,
} as const satisfies UISFXOptions

/** One short cue per revealed word; no playback queue or background loop. */
export function createStreamingTypingSound(player: UISFXPlayer, canPlay: () => boolean) {
  let active = false
  let unlocked = false
  let disposed = false
  let generation = 0

  function stop() {
    generation += 1
    active = false
    unlocked = false
    player.stopAll()
  }

  return {
    start() {
      if (disposed) return
      stop()
      active = true
      const current = generation
      // Called synchronously from submit, while browser user activation is available.
      void player
        .unlock()
        .then((ready) => {
          if (current === generation && !disposed) unlocked = ready
        })
        .catch(() => undefined)
    },
    word() {
      if (!active || !unlocked || disposed || !canPlay()) return
      try {
        player.play('typing', { retrigger: 'restart', volume: soundLevels.typing.cue })
      } catch {
        // Audio support or device changes must never interrupt the response.
      }
    },
    silence() {
      player.stopAll()
    },
    stop,
    dispose() {
      if (disposed) return
      disposed = true
      stop()
      void player.destroy().catch(() => undefined)
    },
  }
}

const typingInputTypes = new Set([
  'insertText',
  'insertLineBreak',
  'insertParagraph',
  'insertFromComposition',
  'insertCompositionText',
  'deleteContentBackward',
  'deleteContentForward',
  'deleteWordBackward',
  'deleteWordForward',
  'deleteSoftLineBackward',
  'deleteSoftLineForward',
  'deleteHardLineBackward',
  'deleteHardLineForward',
])

/** Listen to actual edits, not key presses: navigation, paste, replacement and code updates stay quiet. */
export function bindInputTypingSounds(root: Document, player: UISFXPlayer) {
  let generation = 0
  let disposed = false

  function available(target: Element) {
    return (
      !root.hidden &&
      root.activeElement === target &&
      target.isConnected &&
      !target.matches(':disabled, [readonly]') &&
      !target.closest('[inert]')
    )
  }

  function silence() {
    generation += 1
    player.stopAll()
  }
  function visibilityChanged() {
    if (root.hidden) silence()
  }

  function input(event: Event) {
    const edit = event as InputEvent
    const target = event.target
    if (
      !event.isTrusted ||
      edit.isComposing ||
      !(target instanceof Element) ||
      !target.matches('input[data-typing-sound], textarea[data-typing-sound]') ||
      !available(target)
    )
      return
    // Native date/time editors emit plain input events rather than InputEvent.
    const nativeDateEdit =
      !edit.inputType &&
      target.matches(
        'input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"]',
      )
    if (!typingInputTypes.has(edit.inputType) && !nativeDateEdit) return
    const current = ++generation
    // Unlock in the edit's user gesture; discard stale unlocks instead of queueing keystrokes.
    void player
      .unlock()
      .then((ready) => {
        if (!ready || disposed || current !== generation || !available(target)) return
        player.play('typing', { retrigger: 'restart', volume: soundLevels.typing.cue })
      })
      .catch(() => undefined)
  }

  root.addEventListener('input', input)
  root.addEventListener('blur', silence, true)
  root.addEventListener('visibilitychange', visibilityChanged)
  return () => {
    if (disposed) return
    disposed = true
    silence()
    root.removeEventListener('input', input)
    root.removeEventListener('blur', silence, true)
    root.removeEventListener('visibilitychange', visibilityChanged)
    void player.destroy().catch(() => undefined)
  }
}
