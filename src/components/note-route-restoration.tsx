'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { restoreNoteReturn } from '@/features/notes/route-restoration'
import {
  completeNoteRouteTransition,
  isNoteTransitionTo,
  startNoteRouteTransition,
} from '@/features/notes/route-transition'

/** Restore geometry before releasing the route's new snapshot. */
export function NoteRouteRestoration() {
  const pathname = usePathname()
  const previousPath = useRef(pathname)
  useLayoutEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname
    queueMicrotask(() => {
      if (pathname === '/' && previous.startsWith('/notes/')) {
        restoreNoteReturn(previous.slice('/notes/'.length))
      }
      completeNoteRouteTransition(pathname)
    })
  }, [pathname])

  useEffect(() => {
    // A toolbar Back call is already coordinated. For browser Back/Forward,
    // replay the same event after the old snapshot, letting Next own history.
    let replaying = false
    const onPopState = (event: PopStateEvent) => {
      if (replaying) return
      const target = window.location.pathname
      const source = previousPath.current
      if (isNoteTransitionTo(target) || !event.state?.__NA) return
      const direction =
        source === '/' && target.startsWith('/notes/')
          ? 'open'
          : target === '/' && source.startsWith('/notes/')
            ? 'close'
            : null
      if (!direction) return
      const slug = (direction === 'open' ? target : source).slice('/notes/'.length)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return
      event.stopImmediatePropagation()
      startNoteRouteTransition(slug, direction, target, () => {
        replaying = true
        try {
          window.dispatchEvent(new PopStateEvent('popstate', { state: event.state }))
        } finally {
          replaying = false
        }
      })
    }
    window.addEventListener('popstate', onPopState, true)
    return () => window.removeEventListener('popstate', onPopState, true)
  }, [])
  return null
}
