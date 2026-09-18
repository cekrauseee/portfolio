'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { preferenceOptionClassName } from '@/components/preference-option'
import { toggleSoundProps } from '@/components/links'
import { setLocalePreference } from '@/i18n/actions'
import { locales, type Locale } from '@/i18n/config'
import { requestLocaleTransition } from '@/i18n/locale-transition'
import { stabilizeViewportAnchor } from '@/lib/viewport-scroll'

const languageAnchorStorageKey = 'portfolio-language-anchor'

export function LanguageSwitcher({
  locale,
  labels,
  label,
}: {
  locale: Locale
  labels: Record<Locale, string>
  label: string
}) {
  const buttonRefs = useRef<Partial<Record<Locale, HTMLButtonElement | null>>>({})
  const anchorFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const releaseAnchor = () => {
      sessionStorage.removeItem(languageAnchorStorageKey)
      if (anchorFrameRef.current !== null) {
        cancelAnimationFrame(anchorFrameRef.current)
        anchorFrameRef.current = null
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(
          event.key,
        )
      ) {
        releaseAnchor()
      }
    }
    window.addEventListener('wheel', releaseAnchor, { passive: true })
    window.addEventListener('touchmove', releaseAnchor, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('wheel', releaseAnchor)
      window.removeEventListener('touchmove', releaseAnchor)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useLayoutEffect(() => {
    const storedAnchor = sessionStorage.getItem(languageAnchorStorageKey)
    if (!storedAnchor) {
      return
    }

    let parsedAnchor: unknown
    try {
      parsedAnchor = JSON.parse(storedAnchor)
    } catch {
      sessionStorage.removeItem(languageAnchorStorageKey)
      return
    }

    if (
      !parsedAnchor ||
      typeof parsedAnchor !== 'object' ||
      !('locale' in parsedAnchor) ||
      !('top' in parsedAnchor) ||
      typeof parsedAnchor.locale !== 'string' ||
      typeof parsedAnchor.top !== 'number' ||
      !Number.isFinite(parsedAnchor.top)
    ) {
      sessionStorage.removeItem(languageAnchorStorageKey)
      return
    }

    if (parsedAnchor.locale !== locale) {
      return
    }

    const targetTop = parsedAnchor.top

    sessionStorage.removeItem(languageAnchorStorageKey)

    // Text is already committed. Correct its new layout before paint and once
    // on the next frame, without holding focus/scroll for an entrance animation.
    let remainingFrames = 2
    buttonRefs.current[locale]?.focus({ preventScroll: true })

    function keepButtonStable() {
      const button = buttonRefs.current[locale]
      if (!button) {
        anchorFrameRef.current = null
        return
      }

      stabilizeViewportAnchor(button, targetTop)

      remainingFrames -= 1
      if (remainingFrames > 0) {
        anchorFrameRef.current = requestAnimationFrame(keepButtonStable)
      } else {
        anchorFrameRef.current = null
      }
    }

    keepButtonStable()

    return () => {
      if (anchorFrameRef.current !== null) {
        cancelAnimationFrame(anchorFrameRef.current)
        anchorFrameRef.current = null
      }
    }
  }, [locale])

  return (
    <fieldset className="w-max min-w-0">
      <legend className="sr-only">{label}</legend>
      <form
        action={setLocalePreference}
        data-locale-switcher
        className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1"
      >
        {locales.map((candidate) => (
          <button
            {...(candidate === locale ? {} : toggleSoundProps)}
            className={preferenceOptionClassName}
            onClick={(event) => {
              if (candidate === locale) {
                event.preventDefault()
                return
              }

              const content = event.currentTarget.closest<HTMLElement>('[data-locale-content]')
              if (content) {
                requestLocaleTransition(content, candidate)
              }

              sessionStorage.setItem(
                languageAnchorStorageKey,
                JSON.stringify({
                  locale: candidate,
                  top: event.currentTarget.getBoundingClientRect().top,
                }),
              )
            }}
            ref={(button) => {
              buttonRefs.current[candidate] = button
            }}
            type="submit"
            name="locale"
            value={candidate}
            aria-pressed={candidate === locale}
            key={candidate}
          >
            {labels[candidate]}
          </button>
        ))}
      </form>
    </fieldset>
  )
}
