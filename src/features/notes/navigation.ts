const returnKey = 'portfolio-note-return'
let openedFromPortfolio: NoteReturnPoint | null = null

export type NoteReturnPoint = { slug: string; scrollTop: number; triggerTop: number }

export function parseNoteReturnPoint(value: string | null): NoteReturnPoint | null {
  if (!value) return null
  try {
    const data: unknown = JSON.parse(value)
    if (!data || typeof data !== 'object') return null
    const point = data as Partial<NoteReturnPoint>
    return typeof point.slug === 'string' &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(point.slug) &&
      typeof point.scrollTop === 'number' &&
      Number.isFinite(point.scrollTop) &&
      point.scrollTop >= 0 &&
      typeof point.triggerTop === 'number' &&
      Number.isFinite(point.triggerTop)
      ? (point as NoteReturnPoint)
      : null
  } catch {
    return null
  }
}

export function rememberNoteReturn(point: NoteReturnPoint) {
  openedFromPortfolio = point
  try {
    sessionStorage.setItem(returnKey, JSON.stringify(point))
  } catch {
    /* Storage can be disabled. */
  }
}
export function noteReturnPoint() {
  try {
    return parseNoteReturnPoint(sessionStorage.getItem(returnKey)) ?? openedFromPortfolio
  } catch {
    return openedFromPortfolio
  }
}
export function canGoBackFromNote(slug: string) {
  return openedFromPortfolio?.slug === slug
}
