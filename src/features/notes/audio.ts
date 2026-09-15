export function prepareNoteAudio(
  audio: Pick<HTMLAudioElement, 'load' | 'preload' | 'src'>,
  sourceUrl: string,
) {
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
