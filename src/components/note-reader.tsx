'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { NoteReadingToolbar } from '@/components/note-reading-toolbar'
import styles from './note-reading.module.css'
import { NoteMarkdown } from '@/components/note-markdown'
import { decodeAlignmentArtifact, type AlignmentArtifact } from '@/features/notes/alignment'
import {
  canContinuePlayback,
  nextPlaybackRequest,
  prepareNoteAudio,
  setNoteAudioVolume,
} from '@/features/notes/audio'
import type { ReadableNote } from '@/content/notes'
import type { Dictionary } from '@/i18n/dictionary'

type ReaderStatus =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'waiting' | 'ended' | 'error'

const playbackEventName = 'notes-audio-play'
export function NoteReader({
  note,
  dictionary,
  isOpen,
  navigation,
  onClose,
  children,
}: {
  note: ReadableNote
  dictionary: Dictionary['notes']
  isOpen: boolean
  navigation: Dictionary['navigation']
  onClose: () => void
  children: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [alignment, setAlignment] = useState<AlignmentArtifact | null>(null)
  const [alignmentStatus, setAlignmentStatus] = useState<ReaderStatus>('idle')
  const [audioStatus, setAudioStatus] = useState<ReaderStatus>('idle')
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [durationMs, setDurationMs] = useState(note.durationMs)
  const [retry, setRetry] = useState(0)
  const playTokenRef = useRef(0)

  useLayoutEffect(() => {
    // This component owns the DOM ref, so it is attached before this effect.
    const root = rootRef.current
    if (!root) return
    setToolbarTarget(root.closest('main'))
  }, [isOpen, note.contentLocale])

  useEffect(() => {
    const handleOtherAudio = (event: Event) => {
      const customEvent = event as CustomEvent<{ noteId?: string }>
      if (customEvent.detail?.noteId !== note.id) {
        nextPlaybackRequest(playTokenRef)
        audioRef.current?.pause()
      }
    }
    document.addEventListener(playbackEventName, handleOtherAudio)
    return () => document.removeEventListener(playbackEventName, handleOtherAudio)
  }, [note.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!isOpen || !audio || !note.audioUrl || !note.alignmentUrl) {
      nextPlaybackRequest(playTokenRef)
      audio?.pause()
      return
    }
    const controller = new AbortController()
    setAlignment(null)
    setAlignmentStatus('loading')
    setAudioStatus('idle')
    setCurrentTimeMs(0)
    setDurationMs(note.durationMs)
    setNoteAudioVolume(audio)
    audio.preload = 'none'
    audio.src = note.audioUrl

    void fetch(note.alignmentUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('alignment request failed')
        }
        return response.json() as Promise<unknown>
      })
      .then((value) => {
        const decoded = decodeAlignmentArtifact(value, {
          noteId: note.id,
          locale: note.contentLocale,
          spokenText: note.spokenText,
        })
        setAlignment(decoded)
        setAlignmentStatus('ready')
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return
        }
        setAlignment(null)
        setAlignmentStatus('error')
        setAudioStatus('error')
      })

    return () => {
      nextPlaybackRequest(playTokenRef)
      controller.abort()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [
    isOpen,
    note.alignmentUrl,
    note.audioUrl,
    note.contentLocale,
    note.durationMs,
    note.id,
    note.spokenText,
    retry,
  ])

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio || alignmentStatus !== 'ready' || audioStatus === 'error') {
      return
    }
    if (audio.paused) {
      if (audio.preload === 'none') prepareNoteAudio(audio, note.audioUrl)
      setFocusRequest((value) => value + 1)
      document.dispatchEvent(new CustomEvent(playbackEventName, { detail: { noteId: note.id } }))
      const playToken = nextPlaybackRequest(playTokenRef)
      void audio
        .play()
        .then(() => {
          if (!canContinuePlayback(playToken, playTokenRef.current, isOpen)) {
            audio.pause()
          }
        })
        .catch(() => {
          if (playToken === playTokenRef.current) {
            setAudioStatus('error')
          }
        })
    } else {
      nextPlaybackRequest(playTokenRef)
      audio.pause()
    }
  }

  const isBlocked = alignmentStatus === 'error'
  const hasError = isBlocked || audioStatus === 'error'
  const isPlaying = audioStatus === 'playing' || audioStatus === 'waiting'
  const buttonLabel = hasError ? dictionary.retry : isPlaying ? dictionary.pause : dictionary.play
  const isReady = alignmentStatus === 'ready' && audioStatus !== 'error'
  const playerMessage = isBlocked
    ? dictionary.syncUnavailable
    : audioStatus === 'error'
      ? dictionary.audioError
      : audioStatus === 'waiting'
        ? dictionary.buffering
        : alignmentStatus === 'loading' || audioStatus === 'loading'
          ? dictionary.preparing
          : ''

  return (
    <div ref={rootRef} className={styles.readerContent} data-open={isOpen}>
      <NoteMarkdown
        locale={note.contentLocale}
        enabled={isOpen}
        focusRequest={focusRequest}
        alignment={alignment}
        audioRef={audioRef}
        isPlaying={audioStatus === 'playing'}
        currentTimeMs={currentTimeMs}
      >
        {children}
      </NoteMarkdown>
      {isOpen && note.audioUrl && note.alignmentUrl ? (
        <section
          aria-label={dictionary.playerLabel}
          className={`flex flex-col gap-3 text-sm text-black/65 dark:text-white/70 ${playerMessage ? 'mt-4' : ''}`}
        >
          <audio
            aria-label={dictionary.audioLabel}
            className="sr-only"
            onCanPlay={(event) => setAudioStatus(event.currentTarget.paused ? 'ready' : 'playing')}
            onDurationChange={(event) => {
              const nextDuration = event.currentTarget.duration * 1000
              if (Number.isFinite(nextDuration) && nextDuration > 0) {
                setDurationMs(nextDuration)
              }
            }}
            onEnded={(event) => {
              setCurrentTimeMs(event.currentTarget.duration * 1000 || durationMs)
              setAudioStatus('ended')
            }}
            onError={() => {
              setAudioStatus('error')
            }}
            onLoadedMetadata={(event) => {
              const nextDuration = event.currentTarget.duration * 1000
              if (Number.isFinite(nextDuration) && nextDuration > 0) {
                setDurationMs(nextDuration)
              }
              setAudioStatus('ready')
            }}
            onPause={(event) => {
              setCurrentTimeMs(event.currentTarget.currentTime * 1000)
              setAudioStatus((status) => (status === 'ended' ? status : 'paused'))
            }}
            onPlay={() => setAudioStatus('playing')}
            onPlaying={() => setAudioStatus('playing')}
            onWaiting={() => setAudioStatus('waiting')}
            preload="none"
            ref={audioRef}
            src={note.audioUrl}
          />
          {playerMessage ? (
            <div
              className="flex flex-wrap items-center gap-3"
              role={isBlocked || audioStatus === 'error' ? 'alert' : 'status'}
            >
              <span>{playerMessage}</span>
            </div>
          ) : null}
        </section>
      ) : null}
      <div ref={dockRef} className={styles.toolbarDock}>
        <NoteReadingToolbar
          dockRef={dockRef}
          target={toolbarTarget}
          rootRef={rootRef}
          visible={isOpen}
          onClose={onClose}
          isPlaying={isPlaying}
          disabled={!isReady && !hasError}
          playLabel={buttonLabel}
          onPlayback={hasError ? () => setRetry((value) => value + 1) : togglePlayback}
          onLanguageChange={() => {
            nextPlaybackRequest(playTokenRef)
            audioRef.current?.pause()
          }}
          contentLocale={note.contentLocale}
          dictionary={dictionary}
          navigation={navigation}
        />
      </div>
    </div>
  )
}
