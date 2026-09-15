import { getViewportScroller } from '@/lib/viewport-scroll'
import { noteReturnPoint } from './navigation'

export function noteViewport(element: HTMLElement) {
  const scroller = getViewportScroller(element)
  const visual = window.visualViewport
  const top = visual?.offsetTop ?? 0
  const bottom = top + (visual?.height ?? window.innerHeight)
  if (scroller === document.scrollingElement) return { top, bottom }
  const bounds = scroller.getBoundingClientRect()
  return { top: Math.max(top, bounds.top), bottom: Math.min(bottom, bounds.bottom) }
}

export function noteHeaderIsVisible(
  header: Pick<DOMRect, 'top' | 'bottom' | 'height'>,
  viewport: { top: number; bottom: number },
) {
  return header.height > 0 && header.top >= viewport.top && header.bottom <= viewport.bottom
}

export function noteReturnScrollTop(
  anchor: Pick<DOMRect, 'top' | 'height'>,
  viewport: { top: number; bottom: number },
  scroller: Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'>,
  previousTop?: number,
) {
  const inset = Math.min(24, Math.max(0, (viewport.bottom - viewport.top) / 4))
  const top = viewport.top + inset
  const bottom = Math.max(top, viewport.bottom - inset - anchor.height)
  const preferred = previousTop ?? top + Math.min(72, (bottom - top) / 3)
  const target = Math.max(top, Math.min(bottom, preferred))
  return Math.max(
    0,
    Math.min(
      scroller.scrollHeight - scroller.clientHeight,
      scroller.scrollTop + anchor.top - target,
    ),
  )
}

/** Place the destination before its snapshot, including visits opened by URL. */
export function restoreNoteReturn(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return
  const main = Array.from(
    document.querySelectorAll<HTMLElement>('main:not([data-note-page])'),
  ).find((element) => element.getClientRects().length > 0)
  if (!main) return
  main.dataset.noteReturning = 'true'
  const link = main.querySelector<HTMLElement>(`[data-note-link="${slug}"]`)
  const anchor = link ?? main.querySelector<HTMLElement>('#notes-heading')
  if (!anchor) return
  const point = noteReturnPoint()
  const scroller = getViewportScroller(anchor)
  scroller.dataset.noteReturning = 'true'
  scroller.scrollTo({
    top: noteReturnScrollTop(
      anchor.getBoundingClientRect(),
      noteViewport(anchor),
      scroller,
      link && point?.slug === slug ? point.triggerTop : undefined,
    ),
    behavior: 'instant',
  })
  if (!link) anchor.setAttribute('tabindex', '-1')
  anchor.focus({ preventScroll: true })
}
