import { soundLevels } from '@/lib/sound-levels'

export function setNoteAudioVolume(audio: Pick<HTMLAudioElement, 'volume'>) {
  audio.volume = soundLevels.noteNarration
}

export function prepareNoteAudio(
  audio: Pick<HTMLAudioElement, 'load' | 'preload' | 'src' | 'volume'>,
  sourceUrl: string,
) {
  setNoteAudioVolume(audio)
  audio.src = sourceUrl
  audio.preload = 'auto'
  audio.load()
}

export function nextPlaybackRequest(token: { current: number }) {
  token.current += 1
  return token.current
}

export function canContinuePlayback(requestToken: number, currentToken: number, isOpen: boolean) {
  return isOpen && requestToken === currentToken
}
