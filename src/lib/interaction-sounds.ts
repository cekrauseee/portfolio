import type * as Cuelume from 'cuelume'
import { soundLevels } from '@/lib/sound-levels'

let engine: Promise<typeof Cuelume> | undefined

function loadEngine() {
  engine ??= import('cuelume').then((cuelume) => {
    // Configure before either delegated events or direct calls can play a cue.
    cuelume.setVolume(soundLevels.cuelume)
    return cuelume
  })
  return engine
}

export function bindInteractionSounds() {
  if (typeof window === 'undefined') return
  void loadEngine()
    .then(({ bind }) => bind())
    .catch(() => undefined)
}

export function playInteractionSound(name: Cuelume.SoundName) {
  if (typeof window === 'undefined') return
  void loadEngine()
    .then(({ play }) => play(name))
    .catch(() => undefined)
}
