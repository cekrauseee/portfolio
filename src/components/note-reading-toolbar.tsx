'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type RefObject } from 'react'
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { ChevronDown, ChevronLeft, ChevronUp, Monitor, Moon, Sun } from 'lucide-react'
import { NoteToolbarTooltip } from '@/components/note-toolbar-tooltip'
import { NotePlaybackButton } from '@/components/note-playback-button'
import { focusVisibleClassName, toggleSoundProps } from '@/components/links'
import { useTheme } from '@/theme/theme-provider'
import { THEME_MEDIA_QUERY } from '@/theme/config'
import { useToolbarDocking } from '@/features/notes/use-toolbar-docking'
import { toolbarPresentation } from '@/features/notes/toolbar-docking'
import { readingThemeOptions } from '@/features/notes/reading-layout'
import { locales, type Locale } from '@/i18n/config'
import { setLocalePreference } from '@/i18n/actions'
import { requestLocaleTransition } from '@/i18n/locale-transition'
import type { Dictionary } from '@/i18n/dictionary'
import styles from './note-reading.module.css'

export function NoteReadingToolbar({
  rootRef,
  dockRef,
  target,
  visible,
  isPlaying,
  disabled,
  playLabel,
  onPlayback,
  onLanguageChange,
  onClose,
  locale,
  dictionary,
  navigation,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  dockRef: RefObject<HTMLDivElement | null>
  target: HTMLElement | null
  visible: boolean
  isPlaying: boolean
  disabled: boolean
  playLabel: string
  onPlayback: () => void
  onLanguageChange: () => void
  onClose: () => void
  locale: Locale
  dictionary: Dictionary['notes']
  navigation: Dictionary['navigation']
}) {
  const { preference, setPreference } = useTheme()
  const [baseTheme, setBaseTheme] = useState(preference)
  const previousPreference = useRef(preference)
  const [systemDark, setSystemDark] = useState(false)
  const [minimized, setMinimized] = useState(false)
  // Direct loads animate in the initial HTML. Client navigation already has
  // a route snapshot, and must not replay the entrance when that route settles.
  const [animateEntry] = useState(
    () => typeof document === 'undefined' || !document.documentElement.dataset.noteTransition,
  )
  const [fontFamily, setFontFamily] = useState<string>()
  const [pending, startTransition] = useTransition()
  const minimizeRef = useRef<HTMLButtonElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { docked, moving, captureLayout, focusBeforeRef } = useToolbarDocking({
    rootRef,
    dockRef,
    toolbarRef,
    surfaceRef,
    target,
    visible,
    minimized,
  })
  const collapsed = toolbarPresentation(docked, minimized) === 'minimized'
  const tooltipsSuspended = moving || !visible

  useLayoutEffect(() => {
    const previous = focusBeforeRef.current ?? document.activeElement
    if (docked && previous === minimizeRef.current) {
      surfaceRef.current
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true })
    } else if (
      !docked &&
      collapsed &&
      surfaceRef.current?.contains(previous) &&
      previous !== minimizeRef.current
    ) {
      minimizeRef.current?.focus({ preventScroll: true })
    }
    focusBeforeRef.current = null
  }, [docked, collapsed, focusBeforeRef])
  const nextLocale = locales[(locales.indexOf(locale) + 1) % locales.length]

  useLayoutEffect(() => {
    if (rootRef.current) setFontFamily(getComputedStyle(rootRef.current).fontFamily)
  }, [rootRef, target])

  useEffect(() => {
    if (!visible && previousPreference.current !== preference) setBaseTheme(preference)
    previousPreference.current = preference
  }, [visible, preference])

  useEffect(() => {
    const media = window.matchMedia(THEME_MEDIA_QUERY)
    const update = () => {
      setSystemDark(media.matches)
      // The explicit alternative continues to mean "opposite of system".
      if (visible && baseTheme === 'system' && preference !== 'system') {
        const opposite = media.matches ? 'light' : 'dark'
        if (preference !== opposite) setPreference(opposite)
      }
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [baseTheme, preference, setPreference, visible])

  const options = readingThemeOptions(baseTheme, systemDark)
  const nextTheme = options.find((option) => option !== preference) ?? options[0]

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <div
        ref={toolbarRef}
        className={styles.toolbar}
        data-note-reading-toolbar
        data-visible={visible}
        data-entry={animateEntry}
        data-minimized={collapsed}
        data-docked={docked}
        data-moving={moving}
        inert={!visible}
        role="group"
        aria-label={dictionary.toolbarLabel}
        style={{ fontFamily }}
      >
        <div ref={surfaceRef} data-note-toolbar-surface className={styles.pill}>
          <div data-note-toolbar-controls className={styles.controls} inert={collapsed}>
            <div data-note-toolbar-row className={styles.controlRow}>
              <NoteToolbarTooltip
                suspended={tooltipsSuspended || collapsed}
                fontFamily={fontFamily}
                label={dictionary.closeReading}
              >
                <button
                  {...toggleSoundProps}
                  type="button"
                  className={`${focusVisibleClassName} ${styles.control}`}
                  aria-label={dictionary.closeReading}

                  onClick={onClose}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
              </NoteToolbarTooltip>
              <span data-note-toolbar-separator className={styles.separator} aria-hidden="true" />
              <NoteToolbarTooltip
                suspended={tooltipsSuspended || collapsed}
                fontFamily={fontFamily}
                label={playLabel}
              >
                <NotePlaybackButton
                  className={styles.control}
                  isPlaying={isPlaying}
                  label={playLabel}
                  disabled={disabled}
                  onClick={onPlayback}
                />
              </NoteToolbarTooltip>
              <NoteToolbarTooltip
                suspended={tooltipsSuspended || collapsed}
                fontFamily={fontFamily}
                label={navigation.appearanceNavigation}
              >
                <button
                  {...toggleSoundProps}
                  type="button"
                  data-theme-switcher
                  className={`${focusVisibleClassName} ${styles.control}`}
                  aria-label={`${navigation.appearanceNavigation}: ${navigation.appearance[nextTheme]}`}

                  onClick={() => setPreference(nextTheme)}
                >
                  <span aria-hidden="true" className="relative block size-4">
                    <Monitor
                      data-active={preference === 'system'}
                      className="motion-icon absolute inset-0 size-4"
                    />
                    <Moon
                      data-active={preference === 'dark'}
                      className="motion-icon absolute inset-0 size-4"
                    />
                    <Sun
                      data-active={preference === 'light'}
                      className="motion-icon absolute inset-0 size-4"
                    />
                  </span>
                </button>
              </NoteToolbarTooltip>
              <NoteToolbarTooltip
                suspended={tooltipsSuspended || collapsed}
                fontFamily={fontFamily}
                label={navigation.languageNavigation}
              >
                <button
                  {...toggleSoundProps}
                  type="button"
                  data-locale-switcher
                  disabled={pending}
                  className={`${focusVisibleClassName} ${styles.control}`}
                  aria-label={navigation.languageNavigation}

                  onClick={() => {
                    onLanguageChange()
                    const content = rootRef.current?.closest<HTMLElement>('[data-locale-content]')
                    if (content) requestLocaleTransition(content, nextLocale)
                    const data = new FormData()
                    data.set('locale', nextLocale)
                    startTransition(async () => {
                      await setLocalePreference(data)
                    })
                  }}
                >
                  {locale}
                </button>
              </NoteToolbarTooltip>
              <span
                data-note-toolbar-separator
                className={`${styles.separator} ${styles.minimizeSeparator}`}
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            data-note-toolbar-minimize
            className={styles.minimizeControl}
            inert={docked}
            aria-hidden={docked}
          >
            <NoteToolbarTooltip
              suspended={tooltipsSuspended || docked}
              fontFamily={fontFamily}
              label={minimized ? dictionary.expandToolbar : dictionary.minimizeToolbar}
            >
              <button
                {...toggleSoundProps}
                type="button"
                ref={minimizeRef}
                className={`${focusVisibleClassName} ${styles.control}`}
                aria-label={minimized ? dictionary.expandToolbar : dictionary.minimizeToolbar}

                aria-expanded={!minimized}
                onClick={() => {
                  minimizeRef.current?.focus({ preventScroll: true })
                  captureLayout()
                  setMinimized((value) => !value)
                }}
              >
                <span aria-hidden="true" className="relative block size-4">
                  <ChevronUp
                    data-active={minimized}
                    className="motion-icon absolute inset-0 size-4"
                  />
                  <ChevronDown
                    data-active={!minimized}
                    className="motion-icon absolute inset-0 size-4"
                  />
                </span>
              </button>
            </NoteToolbarTooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
