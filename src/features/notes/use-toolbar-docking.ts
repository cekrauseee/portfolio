'use client'

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { shouldDockToolbar } from './toolbar-docking'
import { animateToolbarLayout, captureToolbarLayout, type ToolbarLayout } from './toolbar-motion'

export function useToolbarDocking({
  rootRef,
  dockRef,
  toolbarRef,
  surfaceRef,
  target,
  visible,
  minimized,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  dockRef: RefObject<HTMLDivElement | null>
  toolbarRef: RefObject<HTMLDivElement | null>
  surfaceRef: RefObject<HTMLDivElement | null>
  target: HTMLElement | null
  visible: boolean
  minimized: boolean
}) {
  const [docked, setDocked] = useState(false)
  const [moving, setMoving] = useState(false)
  const currentDocked = useRef(false)
  const wasVisible = useRef(false)
  const before = useRef<ToolbarLayout | null>(null)
  const focusBeforeRef = useRef<Element | null>(null)
  const motion = useRef<ReturnType<typeof animateToolbarLayout> | null>(null)

  const captureLayout = useCallback(() => {
    const toolbar = toolbarRef.current
    const surface = surfaceRef.current
    if (!toolbar || !surface) {
      return
    }
    before.current = captureToolbarLayout(toolbar, surface)
    focusBeforeRef.current = surface.contains(document.activeElement)
      ? document.activeElement
      : null
    setMoving(true)
  }, [surfaceRef, toolbarRef])

  const play = useCallback(() => {
    const start = before.current
    before.current = null
    const toolbar = toolbarRef.current
    const surface = surfaceRef.current
    const entering = visible && !wasVisible.current
    wasVisible.current = visible && !!target && !!toolbar && !!surface
    if (
      !target ||
      !toolbar ||
      !surface ||
      !visible ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.noteTransition
    ) {
      motion.current?.cancel()
      motion.current = null
      setMoving(false)
      return
    }
    // Initial placement belongs to CSS; only later layout changes need FLIP.
    if (entering || !start) {
      setMoving(false)
      return
    }
    motion.current?.cancel()
    motion.current = null
    const run = animateToolbarLayout(toolbar, surface, start)
    motion.current = run
    setMoving(true)
    void run.finished.then(() => {
      if (motion.current === run) {
        motion.current = null
        setMoving(false)
      }
    })
  }, [surfaceRef, toolbarRef, target, visible])

  useLayoutEffect(() => {
    const slot = dockRef.current
    if (!target || !slot || !visible) {
      return
    }
    let frame = 0
    let resized = false
    const measure = () => {
      frame = 0
      const rect = slot.getBoundingClientRect()
      const scrollport = target.getBoundingClientRect()
      const visual = window.visualViewport
      const next = shouldDockToolbar(
        rect,
        {
          top: Math.max(scrollport.top, visual?.offsetTop ?? 0),
          bottom: Math.min(
            scrollport.bottom,
            (visual?.offsetTop ?? 0) + (visual?.height ?? window.innerHeight),
          ),
        },
        currentDocked.current,
      )
      if (next !== currentDocked.current) {
        captureLayout()
        currentDocked.current = next
        setDocked(next)
      } else if (resized && motion.current) {
        captureLayout()
        play()
      }
      resized = false
    }
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(measure)
      }
    }
    const scheduleResize = () => {
      resized = true
      schedule()
    }
    const resize = new ResizeObserver(scheduleResize)
    resize.observe(slot)
    resize.observe(target)
    if (rootRef.current) {
      resize.observe(rootRef.current.closest('article') ?? rootRef.current)
    }
    target.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', scheduleResize)
    window.visualViewport?.addEventListener('resize', scheduleResize)
    window.visualViewport?.addEventListener('scroll', schedule)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      target.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', scheduleResize)
      window.visualViewport?.removeEventListener('resize', scheduleResize)
      window.visualViewport?.removeEventListener('scroll', schedule)
    }
  }, [target, visible, rootRef, dockRef, captureLayout, play])

  useLayoutEffect(() => {
    if (docked === currentDocked.current) {
      play()
    }
  }, [docked, minimized, target, play])

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => {
      motion.current?.cancel()
      motion.current = null
      setMoving(false)
    }
    reduced.addEventListener('change', stop)
    return () => {
      reduced.removeEventListener('change', stop)
      motion.current?.cancel()
      motion.current = null
      wasVisible.current = false
    }
  }, [])

  return { docked, moving, captureLayout, focusBeforeRef }
}
