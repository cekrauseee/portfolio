'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { NoteReader } from '@/components/note-reader'
import { startNoteRouteTransition } from '@/features/notes/route-transition'
import { canGoBackFromNote } from '@/features/notes/navigation'
import type { ReadableNote } from '@/content/notes'
import type { Dictionary } from '@/i18n/dictionary'

export function NotePageReader({
  note,
  dictionary,
  navigation,
  children,
}: {
  note: ReadableNote
  dictionary: Dictionary['notes']
  navigation: Dictionary['navigation']
  children: ReactNode
}) {
  const router = useRouter()
  const close = useCallback(() => {
    startNoteRouteTransition(note.slug, 'close', '/', () => {
      if (canGoBackFromNote(note.slug)) router.back()
      else router.push('/', { scroll: false })
    })
  }, [note.slug, router])
  useEffect(() => {
    router.prefetch('/')
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, router])
  return (
    <NoteReader note={note} dictionary={dictionary} navigation={navigation} isOpen onClose={close}>
      {children}
    </NoteReader>
  )
}
