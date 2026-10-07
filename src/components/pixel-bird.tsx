'use client'

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  advanceBird,
  birdAttention,
  birdMargin,
  birdPointerIdle,
  birdReadingPerch,
  boundBird,
  noticeBirdPointer,
  type BirdFlight,
  type BirdPoint,
  type BirdPointer,
} from '@/lib/bird-motion'
import { motion } from '@/lib/motion'
import { preferenceOptionClassName } from '@/components/preference-option'
import type { Dictionary } from '@/i18n/dictionary'
import styles from './pixel-bird.module.css'

const preferenceKey = 'portfolio-bird'
let visibleInMemory = true
let visibilityLoaded = false

function readVisibility() {
  if (!visibilityLoaded) {
    try {
      visibleInMemory = localStorage.getItem(preferenceKey) !== 'hidden'
    } catch {
      // Keep the in-memory preference when storage is blocked.
    }
    visibilityLoaded = true
  }
  return visibleInMemory
}

function subscribeVisibility(update: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === preferenceKey || event.key === null) {
      visibilityLoaded = false
      update()
    }
  }
  window.addEventListener(preferenceKey, update)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(preferenceKey, update)
    window.removeEventListener('storage', onStorage)
  }
}

function useBirdVisibility() {
  return useSyncExternalStore(subscribeVisibility, readVisibility, () => true)
}

export function BirdPreference({ labels }: { labels: Dictionary['navigation']['bird'] }) {
  const visible = useBirdVisibility()
  return (
    <button
      type="button"
      className={preferenceOptionClassName}
      aria-pressed={visible}
      onClick={() => {
        visibleInMemory = !visible
        try {
          localStorage.setItem(preferenceKey, visible ? 'hidden' : 'visible')
        } catch {
          // The control still works when browser storage is unavailable.
        }
        window.dispatchEvent(new Event(preferenceKey))
      }}
    >
      {labels.label}
      <span className="ml-1.5 text-black/45 dark:text-white/45">
        {visible ? labels.on : labels.off}
      </span>
    </button>
  )
}

/** One resident bird, outside the scrolling pages and their clipping containers. */
export function PixelBird() {
  const visible = useBirdVisibility()
  const pathname = usePathname()
  const habitatRef = useRef<HTMLDivElement>(null)
  const birdRef = useRef<HTMLDivElement>(null)
  const relocateRef = useRef<(previous: string) => void>(() => {})
  const previousPath = useRef(pathname)

  useLayoutEffect(() => {
    const element = birdRef.current
    const habitat = habitatRef.current
    if (!element || !habitat || !visible) {
      return
    }
    const bird = element
    const scene = habitat
    const branches = scene.querySelectorAll<SVGElement>('[data-bird-perch]')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    let content: HTMLElement | null = null
    let headings: HTMLElement[] = []
    let anchor: HTMLElement | null = null
    let perchAim: number | null = null
    let reading = false
    let narration: HTMLElement | null = null
    let readingWord: HTMLElement | null = null
    let readingBlock: HTMLElement | null = null
    let readingAnchor: HTMLElement | null = null
    let margin = birdMargin(32, innerWidth, innerHeight)
    let flight: BirdFlight | null = null
    let home: BirdPoint = { x: 0, y: 0 }
    let followPoint = home
    let attention = 0
    let pointer: BirdPointer | null = null
    let frame = 0
    let lastFrame = 0
    let scrollUntil = 0
    let routeUntil = 0
    let idleTimer: ReturnType<typeof setTimeout>
    let returnTimer: ReturnType<typeof setTimeout>
    let crossingTimer: ReturnType<typeof setTimeout>
    let dirty = true
    let sleeping = false
    let side: 'left' | 'right' = 'left'
    let nextSide: 'left' | 'right' = side
    let facing = 1
    let tilt = 0

    const resize = new ResizeObserver(onResize)

    function collect() {
      const next = document.querySelector<HTMLElement>('main [data-locale-content]')
      if (next !== content) {
        resize.disconnect()
        content = next
        if (content) {
          resize.observe(content)
        }
      }
      reading = !!content?.closest('[data-note-page]')
      headings = content
        ? Array.from(content.querySelectorAll<HTMLElement>('h1, h2, h3, footer')).filter(
            (heading) => !heading.closest('[inert], [aria-hidden="true"]'),
          )
        : []
      return content
    }

    function measure() {
      if (!content) {
        scene.dataset.ready = 'false'
        return
      }
      const visual = window.visualViewport
      const box = content.getBoundingClientRect()
      const textLeft = box.left + parseFloat(getComputedStyle(content).paddingLeft)
      margin = birdMargin(
        textLeft,
        innerWidth,
        visual?.height ?? innerHeight,
        visual?.offsetTop,
        reading ? 80 : 16,
      )
      bird.style.width = `${margin.size}px`
      bird.style.height = `${margin.size}px`
      const aim = perchAim ?? margin.bounds.top + (margin.bounds.bottom - margin.bounds.top) * 0.28
      const candidates = (anchor?.isConnected ? [anchor] : headings)
        .filter((heading) => heading.getClientRects().length > 0)
        .map((heading) => heading.getBoundingClientRect())
        .filter(
          (rect) =>
            rect.bottom > margin.bounds.top + margin.size && rect.top < margin.bounds.bottom,
        )
      const perch = candidates.reduce<DOMRect | null>(
        (nearest, rect) =>
          !nearest || Math.abs(rect.bottom - aim) < Math.abs(nearest.bottom - aim) ? rect : nearest,
        null,
      )
      // Stay beside the paragraph; advance to a new line only when scrolling
      // has carried the paragraph's original reading position out of view.
      let spokenLine = readingAnchor?.isConnected ? readingAnchor.getBoundingClientRect() : null
      if (
        narration &&
        readingWord &&
        (!spokenLine ||
          spokenLine.top < margin.bounds.top ||
          spokenLine.bottom > margin.bounds.bottom)
      ) {
        readingAnchor = readingWord
        spokenLine = readingWord.getBoundingClientRect()
      }
      home = boundBird(
        {
          x: margin.perches[side],
          y: reduced.matches
            ? margin.bounds.top + 24
            : narration
              ? birdReadingPerch(spokenLine?.bottom ?? null, home.y, margin.size, margin.bounds)
              : perch
                ? perch.bottom - margin.size + 2
                : aim,
        },
        margin.bounds,
      )
      if (!flight || reduced.matches) {
        flight = { ...home, vx: 0, vy: 0 }
        followPoint = home
        attention = 0
      }
      // Prepare a temporary branch at the landing point, independently of the bird.
      const branchWidth = Math.min(96, textLeft - 8)
      for (const branch of branches) {
        const left = branch.dataset.birdPerch === 'left'
        const x = left
          ? Math.min(textLeft - 6, margin.perches.left + margin.size + 4) - branchWidth
          : Math.max(innerWidth - textLeft + 6, margin.perches.right - 4)
        const y = home.y + (margin.size * 22) / 24 - branchWidth / 6
        branch.style.width = `${branchWidth}px`
        branch.style.height = `${branchWidth / 4}px`
        branch.style.translate = `${Math.max(2, x)}px ${y}px`
      }
      dirty = false
      scene.dataset.ready = 'true'
    }

    function draw(now: number) {
      frame = 0
      if (dirty) {
        collect()
        measure()
      }
      if (!flight || !content) {
        return
      }
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60
      lastFrame = now
      const looking = reduced.matches ? null : birdAttention(pointer, now, scrollUntil)
      const following = looking?.engaged && !reading && !narration ? 1 : 0
      const blend = 1 - Math.exp(-dt / (motion.duration.feedback / 1000))
      attention = following ? 1 : attention * (1 - blend)
      if (Math.abs(following - attention) < 0.005) {
        attention = following
      }
      if (following && looking) {
        followPoint = boundBird(
          {
            x: looking.x + (side === 'left' ? -margin.size - 24 : 24),
            y: looking.y - margin.size / 2,
          },
          {
            ...margin.bounds,
            left: side === 'right' ? margin.perches.right : margin.bounds.left,
            right: side === 'left' ? margin.perches.left : margin.bounds.right,
          },
        )
      }
      const target = {
        x: home.x + (followPoint.x - home.x) * attention,
        y: home.y + (followPoint.y - home.y) * attention,
      }
      // Lift changes the flight's destination, never its rendered position.
      // The same spring rounds the climb, the crossing and the final descent.
      const crossing =
        side === 'right'
          ? flight.x < margin.perches.right - margin.size
          : flight.x > margin.perches.left + margin.size
      const lift = reduced.matches ? 0 : Math.min(56, Math.abs(target.x - flight.x) * 0.12)
      const destination = boundBird({ x: target.x, y: target.y - lift }, margin.bounds)
      flight = reduced.matches
        ? { ...home, vx: 0, vy: 0 }
        : advanceBird(flight, destination, dt, crossing)
      const bounded = boundBird(flight, margin.bounds)
      flight.x = bounded.x
      flight.y = bounded.y
      const distance = Math.hypot(home.x - flight.x, home.y - flight.y)
      const speed = Math.hypot(flight.vx, flight.vy)
      const moving =
        Math.hypot(destination.x - flight.x, destination.y - flight.y) > 0.35 || speed > 2
      const airborne =
        !reduced.matches &&
        (moving || now < scrollUntil || now < routeUntil || (attention > 0.05 && distance > 3))
      const landing =
        airborne &&
        !looking &&
        now >= scrollUntil &&
        now >= routeUntil &&
        distance < 16 &&
        speed < 45
      bird.dataset.state = narration
        ? 'reading'
        : airborne
          ? landing
            ? 'landing'
            : 'flying'
          : looking && !looking.engaged
            ? 'attentive'
            : sleeping
              ? 'sleeping'
              : 'perched'
      bird.style.transform = `translate3d(${flight.x}px, ${flight.y}px, 0)`
      const wantedTilt = airborne && !narration ? Math.max(-8, Math.min(8, flight.vy * 0.035)) : 0
      tilt += (wantedTilt - tilt) * blend
      bird.style.setProperty('--bird-tilt', `${tilt}deg`)
      // Turn into the flight while travelling; settle looking back into the page.
      if (narration) {
        facing = side === 'left' ? 1 : -1
      } else if (Math.abs(flight.vx) > 25) {
        facing = Math.sign(flight.vx)
      } else if (speed < 15) {
        facing = looking
          ? looking.x < flight.x + margin.size / 2
            ? -1
            : 1
          : side === 'left'
            ? 1
            : -1
      }
      bird.style.setProperty('--bird-facing', String(facing))
      bird.style.setProperty('--bird-look', looking && looking.y < flight.y - 32 ? '-1px' : '0px')
      scene.dataset.side = side
      scene.dataset.landed = String(!!narration || (distance < 3 && speed < 8))
      scene.dataset.perching = String(
        !!narration || (!following && now >= scrollUntil && distance < 100),
      )
      if (moving || airborne || attention !== following || Math.abs(wantedTilt - tilt) > 0.05) {
        wake()
      }
    }

    function wake() {
      if (!frame && !document.hidden) {
        frame = requestAnimationFrame(draw)
      }
    }

    function activity() {
      sleeping = false
      clearTimeout(idleTimer)
      if (narration) {
        return
      }
      idleTimer = setTimeout(() => {
        sleeping = true
        releasePointer()
      }, 4500)
    }

    function releasePointer() {
      if (pointer && flight) {
        anchor = null
        perchAim = flight.y + margin.size
        dirty = true
      }
      pointer = null
      nextSide = side
      clearTimeout(returnTimer)
      clearTimeout(crossingTimer)
      wake()
    }

    function onPointer(event: PointerEvent) {
      if (
        !finePointer.matches ||
        reduced.matches ||
        event.pointerType === 'touch' ||
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      pointer = noticeBirdPointer(
        pointer,
        { x: event.clientX, y: event.clientY },
        performance.now(),
      )
      const destination =
        event.clientX > innerWidth / 2 + 64
          ? 'right'
          : event.clientX < innerWidth / 2 - 64
            ? 'left'
            : nextSide
      if (pointer.engaged && !narration && destination !== nextSide) {
        nextSide = destination
        clearTimeout(crossingTimer)
        crossingTimer = setTimeout(() => {
          side = nextSide
          dirty = true
          wake()
        }, motion.duration.settle)
      }
      activity()
      wake()
      clearTimeout(returnTimer)
      returnTimer = setTimeout(releasePointer, birdPointerIdle)
    }

    function onScroll() {
      releasePointer()
      anchor = null
      perchAim = null
      scrollUntil = performance.now() + motion.duration.control
      activity()
      onResize()
    }

    function onResize() {
      dirty = true
      wake()
    }

    function onFocus(event: FocusEvent) {
      if (
        event.target instanceof Element &&
        event.target.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        releasePointer()
      }
    }

    function onVisibility() {
      scene.dataset.suspended = String(document.hidden)
      releasePointer()
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
        clearTimeout(idleTimer)
      } else {
        lastFrame = 0
        activity()
        onResize()
      }
    }

    function syncNarration() {
      const next = content?.querySelector<HTMLElement>('[data-note-audio-state="playing"]') ?? null
      const word = next?.querySelector<HTMLElement>('[data-note-state="current"]') ?? null
      if (next !== narration) {
        narration = next
        readingWord = null
        readingAnchor = null
        readingBlock = null
        releasePointer()
        activity()
        dirty = true
        wake()
      }
      if (word && word !== readingWord) {
        readingWord = word
        const block = word.closest<HTMLElement>('p, h1, h2, h3, li, pre, blockquote')
        if (block !== readingBlock) {
          readingBlock = block
          readingAnchor = word
          dirty = true
          wake()
        }
      }
    }

    const mutations = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === 'childList' || !record.attributeName?.startsWith('data-note-'),
        )
      ) {
        collect()
        onResize()
      }
      syncNarration()
    })
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded', 'aria-hidden', 'data-note-audio-state', 'data-note-state'],
    })
    relocateRef.current = (previous) => {
      releasePointer()
      const current = collect()
      syncNarration()
      const slug = previous.startsWith('/notes/') ? previous.slice('/notes/'.length) : null
      const returning = slug
        ? document.querySelector<HTMLElement>(`[data-note-card="${CSS.escape(slug)}"] h3`)
        : null
      anchor = returning ?? current?.querySelector('h1') ?? null
      attention = 0
      measure()
      if (
        document.documentElement.dataset.noteTransition &&
        typeof document.startViewTransition === 'function'
      ) {
        flight = { ...home, vx: 0, vy: 0 }
        bird.style.transform = `translate3d(${home.x}px, ${home.y}px, 0)`
      }
      routeUntil = performance.now() + motion.duration.page
      activity()
      wake()
    }
    anchor = collect()?.querySelector('h1') ?? null
    syncNarration()
    measure()
    activity()
    wake()
    document.addEventListener('pointermove', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', releasePointer)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', releasePointer)
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    reduced.addEventListener('change', onResize)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(idleTimer)
      clearTimeout(returnTimer)
      clearTimeout(crossingTimer)
      resize.disconnect()
      mutations.disconnect()
      document.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', releasePointer)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', releasePointer)
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
      reduced.removeEventListener('change', onResize)
      relocateRef.current = () => {}
    }
  }, [visible])

  useLayoutEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname
    // Run after the note's scroll restoration and before its new snapshot.
    queueMicrotask(() => relocateRef.current(previous))
  }, [pathname])

  return (
    <div
      ref={habitatRef}
      className={styles.habitat}
      data-bird-habitat
      hidden={!visible}
      aria-hidden="true"
    >
      {(['left', 'right'] as const).map((side) => (
        <svg
          key={side}
          className={styles.branch}
          data-bird-perch={side}
          viewBox="0 0 48 12"
          fill="none"
          shapeRendering="crispEdges"
        >
          <path
            d="M5 7h10V6h8v1h8v1h17v1H30V8H20V7h-4v1H5zM9 5h1v1h3v1h-2V6H9zM24 8h1v2h-1z"
            fill="var(--bird-branch)"
          />
          <path d="M3 4h3v1h2v1H5V5H3zM12 3h3v1h-1v1h-3V4h1z" fill="var(--bird-wing)" />
          <path d="M32 8h16v1H32z" fill="var(--bird-feather)" opacity=".35" />
        </svg>
      ))}
      <div ref={birdRef} className={styles.bird} data-pixel-bird>
        <span className={styles.shadow} />
        <div className={styles.turn}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={styles.sprite}
            shapeRendering="crispEdges"
          >
            <g className={styles.tail}>
              <path d="M2 12h2v2h3v2h3v3H6v-2H4v-2H2z" fill="var(--bird-ink)" />
              <path d="M2 12h2v2h3v1H4v-1H2z" fill="var(--bird-feather)" />
            </g>
            <path d="M9 8h8v2h3v6h-2v3h-3v1H9v-1H7v-3H6v-5h3z" fill="var(--bird-ink)" />
            <path d="M15 10h4v2h1v4h-2v3h-5v-2h-1v-5h3z" fill="var(--bird-breast)" />
            <path d="M15 16h3v3h-3zM12 18h3v2h-3z" fill="var(--bird-belly)" />
            <g className={styles.head}>
              <path d="M11 5h6v1h2v2h1v4h-3v1h-4v-1h-3V7h1z" fill="var(--bird-ink)" />
              <path d="M11 5h6v1h-6zM10 7h1v3h-1z" fill="var(--bird-feather)" />
              <path d="M19 9h3v1h1v1h-4z" fill="var(--bird-beak)" />
              <path d="M16 10h3v2h-3z" fill="var(--bird-breast)" />
              <g className={styles.eye}>
                <path d="M16 7h2v2h-2z" fill="var(--bird-eye)" />
                <path d="M17 7h1v1h-1z" fill="var(--bird-ink)" />
              </g>
              <path className={styles.closedEye} d="M16 9h2v1h-2z" fill="var(--bird-eye)" />
            </g>
            <g className={styles.foldedWing}>
              <path d="M8 11h4v1h2v4h-2v1H9v-2H8z" fill="var(--bird-wing)" />
              <path d="M8 11h4v1h1v1H9v1H8zM10 15h3v1h-3z" fill="var(--bird-feather)" />
            </g>
            <g className={styles.wingUp}>
              <path d="M6 2h2v2h2v3h2v7H9v-2H7V9H6z" fill="var(--bird-wing)" />
              <path d="M6 2h2v3H7v3H6zM8 5h2v4H8z" fill="var(--bird-feather)" />
            </g>
            <g className={styles.wingOut}>
              <path d="M2 9h5v1h3v1h3v4H9v-1H6v-1H4v-2H2z" fill="var(--bird-wing)" />
              <path d="M2 9h5v1h3v1H5v-1H2z" fill="var(--bird-feather)" />
            </g>
            <g className={styles.wingDown}>
              <path d="M9 12h4v5h-2v3H9v2H7v-6h2z" fill="var(--bird-wing)" />
              <path d="M7 17h2v3H8v2H7z" fill="var(--bird-feather)" />
            </g>
            <path
              className={styles.feet}
              d="M10 20h1v2h-3v-1h2zM15 19h1v3h-3v-1h2z"
              fill="var(--bird-beak)"
            />
            <g className={styles.book}>
              <path d="M10 16h5v1h1v-1h6v6h-6v1h-1v-1h-5z" fill="var(--bird-branch)" />
              <path d="M11 16h4v1h1v5h-1v-1h-4zM17 17h1v-1h3v5h-4z" fill="var(--bird-page)" />
              <path d="M12 18h2v1h-2zM18 18h2v1h-2z" fill="var(--bird-branch)" opacity=".55" />
              <path
                className={styles.bookLine}
                d="M12 20h2v1h-2zM18 20h2v1h-2z"
                fill="var(--bird-breast)"
              />
            </g>
          </svg>
        </div>
        <svg
          className={styles.notice}
          viewBox="0 0 24 24"
          fill="var(--bird-breast)"
          shapeRendering="crispEdges"
        >
          <path d="M12 2h2v7h-2zM12 11h2v2h-2z" />
          <path
            d="M4 11h1v2h2v1H5v2H4v-2H2v-1h2zM20 7h1v2h2v1h-2v2h-1v-2h-2V9h2z"
            fill="var(--bird-beak)"
          />
        </svg>
        <svg
          className={styles.dream}
          viewBox="0 0 24 24"
          fill="var(--bird-feather)"
          shapeRendering="crispEdges"
        >
          <g>
            <path d="M2 16h5v1H6v1H5v1H4v1h3v1H2v-1h1v-1h1v-1h1v-1H2z" />
          </g>
          <g>
            <path d="M10 9h5v1h-1v1h-1v1h-1v1h3v1h-5v-1h1v-1h1v-1h1v-1h-3z" />
          </g>
          <g>
            <path d="M18 2h5v1h-1v1h-1v1h-1v1h3v1h-5V6h1V5h1V4h1V3h-3z" />
          </g>
        </svg>
      </div>
    </div>
  )
}
