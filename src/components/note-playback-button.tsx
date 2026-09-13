'use client'

import type { ComponentPropsWithRef } from 'react'
import { CirclePause, Volume2 } from 'lucide-react'
import { focusVisibleClassName, toggleSoundProps } from '@/components/links'

export function NotePlaybackButton({
  isPlaying,
  label,
  className = '',
  ...buttonProps
}: Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  isPlaying: boolean
  label: string
}) {
  return (
    <button
      {...toggleSoundProps}
      {...buttonProps}
      aria-label={label}
      type="button"
      className={`${focusVisibleClassName} ${className}`}
    >
      <span aria-hidden="true" className="relative block size-4">
        <CirclePause
          data-active={isPlaying}
          className="motion-icon absolute inset-0 size-4 fill-current [&>line]:stroke-white dark:[&>line]:stroke-black"
        />
        <Volume2 data-active={!isPlaying} className="motion-icon absolute inset-0 size-4" />
      </span>
    </button>
  )
}
