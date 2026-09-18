'use client'

import {
  Children,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { motion } from '@/lib/motion'
import { useCollapsibleHash } from '@/lib/use-collapsible-hash'
import { disclosureSoundProps, linkFocusClassName } from '@/components/links'
import {
  accommodateReadyContent,
  releaseCollapsedViewport,
  stabilizeViewportAnchor,
} from '@/lib/viewport-scroll'

type CollapsiblePreview = {
  slug: string
  name: string
  description: string
  languageTag?: string
  meta?: string
}

export function ProjectCollapsibleList({
  projects,
  children,
  idPrefix = 'project',
}: {
  projects: readonly CollapsiblePreview[]
  children: ReactNode
  idPrefix?: 'project' | 'experience'
}) {
  const [openSlug, setOpenSlug, fromHash] = useCollapsibleHash(
    `${idPrefix}/`,
    projects.map((project) => project.slug),
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const cancelAnchorRef = useRef<(() => void) | null>(null)
  const contents = Children.toArray(children)
  const previousSlug = useRef<string | null>(null)

  useLayoutEffect(() => {
    const previous = previousSlug.current
    previousSlug.current = openSlug
    const slug = openSlug ?? previous
    if (fromHash) cancelAnchorRef.current?.()
    if (!slug || !rootRef.current || cancelAnchorRef.current) {
      return
    }
    if (!openSlug && fromHash && window.location.hash) return
    const panel = document.getElementById(`${idPrefix}-${slug}-panel`)
    const article = panel?.closest('article')
    if (panel && article) {
      return openSlug
        ? accommodateReadyContent(article, panel, previous !== null, fromHash ? 'hash' : 'expand')
        : releaseCollapsedViewport(rootRef.current, panel)
    }
  }, [idPrefix, openSlug, setOpenSlug, fromHash])

  function preserveViewportPosition(anchor: HTMLElement) {
    cancelAnchorRef.current?.()

    const targetTop = anchor.getBoundingClientRect().top
    const main = anchor.closest<HTMLElement>('main')
    const hasScrollContainer =
      main && /^(auto|scroll)$/.test(window.getComputedStyle(main).overflowY)
    const readScrollTop = () => (hasScrollContainer ? main.scrollTop : window.scrollY)
    let expectedScrollTop = readScrollTop()
    let startedAt: number | null = null
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : motion.duration.page
    let frame: number | null = null

    function cancel() {
      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
      frame = null
      for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        window.removeEventListener(event, cancel, true)
      }
      if (cancelAnchorRef.current === cancel) {
        cancelAnchorRef.current = null
      }
    }

    function keepAnchorStable(now: number) {
      startedAt ??= now
      // User or external scrolling takes priority over our layout correction.
      if (!anchor.isConnected || Math.abs(readScrollTop() - expectedScrollTop) > 0.5) {
        cancel()
        return
      }

      stabilizeViewportAnchor(anchor, targetTop)
      expectedScrollTop = readScrollTop()

      if (now - startedAt < duration) {
        frame = requestAnimationFrame(keepAnchorStable)
      } else {
        cancel()
      }
    }

    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      window.addEventListener(event, cancel, { capture: true, passive: true })
    }
    cancelAnchorRef.current = cancel
    frame = requestAnimationFrame(keepAnchorStable)
  }

  function toggleProject(slug: string) {
    cancelAnchorRef.current?.()
    const nextSlug = openSlug === slug ? null : slug

    setOpenSlug(nextSlug)
  }

  useEffect(() => {
    if (!openSlug) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      cancelAnchorRef.current?.()
      setOpenSlug(null)
      document.getElementById(`${idPrefix}-${openSlug}-trigger`)?.focus({ preventScroll: true })
    }

    function handleClick(event: MouseEvent) {
      if (
        !rootRef.current ||
        !(event.target instanceof Element) ||
        rootRef.current.contains(event.target) ||
        // Locale and theme changes preserve the expanded item. Closing it here
        // would interrupt the preference transition and collapse the panel.
        event.target.closest(
          '[data-locale-switcher], [data-theme-switcher], [data-note-reading-toolbar]',
        )
      ) {
        return
      }

      const anchor = event.target.closest<HTMLElement>(
        'button, a, input, select, textarea, [tabindex]',
      )

      cancelAnchorRef.current?.()
      setOpenSlug(null)

      if (anchor) {
        preserveViewportPosition(anchor)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClick)
    }
  }, [idPrefix, openSlug, setOpenSlug])

  useEffect(
    () => () => {
      cancelAnchorRef.current?.()
    },
    [],
  )

  return (
    <div className="flex flex-col gap-5" ref={rootRef}>
      {projects.map((project, index) => {
        const isOpen = openSlug === project.slug
        const isDimmed = openSlug !== null && !isOpen
        const triggerId = `${idPrefix}-${project.slug}-trigger`
        const panelId = `${idPrefix}-${project.slug}-panel`

        return (
          <article
            className={`animate-journal-fade ease-standard origin-left transition-[filter,opacity] duration-(--motion-settle) motion-reduce:animate-none motion-reduce:transition-none ${
              isDimmed ? 'opacity-35 blur-[1.5px]' : 'blur-0 opacity-100'
            }`}
            key={project.slug}
            style={
              {
                '--motion-entry-delay': `${Math.min(motion.stagger.section + (index + 1) * motion.stagger.item, motion.stagger.footer)}ms`,
              } as CSSProperties
            }
          >
            <h3 className="animate-journal-rise origin-left motion-reduce:animate-none">
              <button
                {...disclosureSoundProps(isOpen)}
                aria-controls={panelId}
                aria-expanded={isOpen}
                className={`${linkFocusClassName} group block w-full cursor-pointer text-left`}
                id={triggerId}
                onClick={() => toggleProject(project.slug)}
                type="button"
              >
                <span className="ease-standard block text-[0.9375rem] leading-relaxed font-medium text-black/65 lowercase transition-colors duration-(--motion-feedback) group-hover:text-black group-focus-visible:text-black motion-reduce:transition-none dark:text-white/70 dark:group-hover:text-white dark:group-focus-visible:text-white">
                  {project.name}
                </span>
                <span
                  className="mt-1 block max-w-[52ch] text-sm leading-relaxed font-normal text-black/60 lowercase dark:text-white/65"
                  lang={project.languageTag}
                >
                  {project.description}
                  {project.meta ? <span> · {project.meta}</span> : null}
                </span>
              </button>
            </h3>

            <div
              aria-hidden={!isOpen}
              aria-labelledby={triggerId}
              className={`ease-standard grid transition-[grid-template-rows,opacity] duration-[var(--motion-page),var(--motion-settle)] motion-reduce:transition-none ${
                isOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'pointer-events-none grid-rows-[0fr] opacity-0'
              }`}
              id={panelId}
              data-collapsible-panel
              inert={isOpen ? undefined : true}
              role="region"
            >
              <div className="min-h-0 overflow-x-visible overflow-y-clip">
                <div
                  className={`ease-standard origin-top-left pb-1 transition-transform duration-(--motion-page) motion-reduce:transform-none motion-reduce:transition-none ${isOpen ? 'translate-y-0' : 'translate-y-(--motion-rise)'}`}
                >
                  {contents[index]}
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
