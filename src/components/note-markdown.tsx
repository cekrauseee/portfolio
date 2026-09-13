'use client'

import { useRef, type RefObject, type ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { useNoteReading } from '@/features/notes/use-note-reading'
import styles from './note-markdown.module.css'
import { type AlignmentArtifact } from '@/features/notes/alignment'

export function NoteMarkdown({
  children,
  alignment,
  currentTimeMs,
  audioRef,
  isPlaying,
  focusRequest,
  enabled,
  locale,
}: {
  children: ReactNode
  alignment: AlignmentArtifact | null
  currentTimeMs: number
  audioRef: RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  focusRequest: number
  enabled: boolean
  locale: Locale
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  useNoteReading({
    rootRef,
    audioRef,
    alignment,
    currentTimeMs,
    isPlaying,
    focusRequest,
    enabled,
    locale,
  })

  return (
    <div ref={rootRef} className={`${styles.reading} [&>h2+p]:mt-2 [&>h3+p]:mt-2`}>
      {children}
    </div>
  )
}
