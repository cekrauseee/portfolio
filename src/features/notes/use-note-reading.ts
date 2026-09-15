'use client'

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { Locale } from '@/i18n/config'
import { getViewportScroller } from '@/lib/viewport-scroll'
import { type AlignmentArtifact, unitPlaybackState } from './alignment'
import { createReadingCamera } from './reading-layout'
import {
  createReadingReturnTimer,
  createReadingScrollGuard,
  readingFocusScrollDelta,
  canFollowNarration,
  noteUnitForRange,
} from './reading'

export function useNoteReading({
  rootRef,
  audioRef,
  alignment,
  currentTimeMs,
  isPlaying,
  focusRequest,
  enabled,
  locale,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  audioRef: RefObject<HTMLAudioElement | null>
  alignment: AlignmentArtifact | null
  currentTimeMs: number
  isPlaying: boolean
  focusRequest: number
  enabled: boolean
  locale: Locale
}) {
  // Fast Refresh preserves refs but invalidates memoized controllers, so updated
  // effects never receive a controller from an older implementation.
  const scrollGuard = useMemo(() => createReadingScrollGuard(), [])
  const handledRequest = useRef(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) {
      return
    }
    let words = Array.from(root.querySelectorAll<HTMLElement>('[data-note-start]'))
    let wordAlignment: AlignmentArtifact | null = null
    const header = root
      .closest('article')
      ?.querySelector<HTMLElement>(':scope > [data-note-header], :scope > h3')
    const scroller = getViewportScroller(root)
    const scrollTarget = scroller === document.scrollingElement ? window : scroller
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const guard = scrollGuard
    const camera = createReadingCamera(scroller)
    let frame = 0
    let lastActive = -1
    let reframe = false
    let explicit = focusRequest > 0 && focusRequest !== handledRequest.current
    if (explicit) {
      handledRequest.current = focusRequest
      guard.reset()
    }
    const idleReturn = createReadingReturnTimer(guard, () => {
      const audio = audioRef.current
      if (!canFollowNarration(isPlaying, audio) || !alignment) return
      reframe = true
      if (!frame) frame = requestAnimationFrame(update)
    })
    const stopFollowing = () => {
      guard.manual(performance.now())
      explicit = false
      reframe = false
      lastActive = -1
      camera.cancel()
      guard.endAutomatic()
      if (isPlaying) idleReturn.restart()
    }
    const onScroll = () => {
      if (!camera.isExpectedScroll()) stopFollowing()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          'button, a, input, textarea, select, [contenteditable="true"]',
        )
      )
        return
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        stopFollowing()
    }
    const update = () => {
      frame = 0
      const now = performance.now()
      if (!camera.isExpectedScroll()) stopFollowing()
      const audio = audioRef.current
      if (wordAlignment !== alignment) {
        wordAlignment = alignment
        words = Array.from(root.querySelectorAll<HTMLElement>('[data-note-start]'))
        for (const word of words) {
          const index = wordAlignment
            ? noteUnitForRange(
                wordAlignment.units,
                Number(word.dataset.noteStart),
                Number(word.dataset.noteEnd),
              )
            : -1
          if (index >= 0) word.dataset.noteUnit = String(index)
          else delete word.dataset.noteUnit
        }
      }
      const time = audio ? audio.currentTime * 1000 : currentTimeMs
      root.dataset.narrating = String(time > 0 || isPlaying)
      let active: HTMLElement | undefined
      let lastSaid: HTMLElement | undefined
      for (const word of words) {
        const unit = wordAlignment?.units[Number(word.dataset.noteUnit)]
        if (!unit) {
          delete word.dataset.noteState
          word.removeAttribute('aria-current')
          continue
        }
        const state = unitPlaybackState(unit, time)
        if (word.dataset.noteState !== state) {
          word.dataset.noteState = state
          if (state === 'current') word.setAttribute('aria-current', 'true')
          else word.removeAttribute('aria-current')
        }
        if (state === 'said') lastSaid = word
        if (state === 'current' && !active) active = word
      }
      active ??= lastSaid ?? words[0] ?? root
      const activeIndex = Number(active.dataset.noteUnit ?? -1)
      if (
        active &&
        !camera.isMoving() &&
        (explicit || reframe || canFollowNarration(isPlaying, audio)) &&
        guard.canFollow(performance.now()) &&
        (explicit || reframe || activeIndex !== lastActive)
      ) {
        const documentScroller = scroller === document.scrollingElement
        const top = documentScroller
          ? (window.visualViewport?.offsetTop ?? 0)
          : scroller.getBoundingClientRect().top
        const height = documentScroller
          ? (window.visualViewport?.height ?? window.innerHeight)
          : scroller.clientHeight
        const delta = readingFocusScrollDelta(
          active.getBoundingClientRect().top,
          header?.getBoundingClientRect().top,
          top,
          height,
        )
        explicit = false
        reframe = false
        camera.start(delta, now, reducedMotion.matches)
        if (camera.isMoving()) guard.startAutomatic()
        lastActive = activeIndex
      }
      if (camera.isMoving()) {
        const documentScroller = scroller === document.scrollingElement
        const top = documentScroller
          ? (window.visualViewport?.offsetTop ?? 0)
          : scroller.getBoundingClientRect().top
        const height = documentScroller
          ? (window.visualViewport?.height ?? window.innerHeight)
          : scroller.clientHeight
        // Follow the changing header geometry without restarting the camera's easing.
        camera.retarget(
          readingFocusScrollDelta(
            active.getBoundingClientRect().top,
            header?.getBoundingClientRect().top,
            top,
            height,
            true,
          ),
        )
        if (camera.step(now)) guard.endAutomatic()
      }
      if (isPlaying || camera.isMoving() || explicit || reframe)
        frame = requestAnimationFrame(update)
    }
    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    // Pointer movement and clicks deliberately have no effect on the idle timer.
    window.addEventListener('wheel', stopFollowing, { passive: true })
    window.addEventListener('touchmove', stopFollowing, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    update()
    if (isPlaying && !guard.canFollow(performance.now())) idleReturn.restart()
    return () => {
      cancelAnimationFrame(frame)
      camera.cancel()
      idleReturn.dispose()
      guard.endAutomatic()
      scrollTarget.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', stopFollowing)
      window.removeEventListener('touchmove', stopFollowing)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    alignment,
    audioRef,
    currentTimeMs,
    enabled,
    focusRequest,
    isPlaying,
    locale,
    rootRef,
    scrollGuard,
  ])
}
