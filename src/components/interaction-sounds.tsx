'use client'

import { useEffect, useRef } from 'react'
import { createUISFX } from 'uisfx'
import { bindInputTypingSounds, typingSoundOptions } from '@/lib/typing-sound'
import { usePathname } from 'next/navigation'
import { bindInteractionSounds, playInteractionSound } from '@/lib/interaction-sounds'

export function InteractionSounds() {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    bindInteractionSounds()
    return bindInputTypingSounds(document, createUISFX(typingSoundOptions))
  }, [])

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }

    const returningFromNote = previousPathname.current.startsWith('/notes/') && pathname === '/'
    previousPathname.current = pathname
    // Closing a note already has its own dismissal cue.
    if (returningFromNote) return
    playInteractionSound('arrival')
  }, [pathname])

  return null
}
