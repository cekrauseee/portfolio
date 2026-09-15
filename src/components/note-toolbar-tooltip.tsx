'use client'

import * as Tooltip from '@radix-ui/react-tooltip'
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import styles from './note-reading.module.css'

export function NoteToolbarTooltip({
  label,
  children,
  fontFamily,
  suspended = false,
}: {
  label: string
  children: ReactElement
  fontFamily?: string
  suspended?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [previousSuspended, setPreviousSuspended] = useState(suspended)
  const intentional = useRef(false)
  // Reset before rendering resumed controls so a stale tooltip cannot reopen.
  if (previousSuspended !== suspended) {
    setPreviousSuspended(suspended)
    setOpen(false)
  }
  useLayoutEffect(() => {
    if (suspended) {
      intentional.current = false
    }
  }, [suspended])

  return (
    <Tooltip.Root
      open={open && !suspended}
      onOpenChange={(next) => setOpen(next && !suspended && intentional.current)}
    >
      <Tooltip.Trigger
        asChild
        onPointerMove={(event) => {
          if (suspended) {
            event.preventDefault()
          } else {
            intentional.current = true
          }
        }}
        onFocus={(event) => {
          if (suspended || !event.currentTarget.matches(':focus-visible')) {
            event.preventDefault()
          } else {
            intentional.current = true
          }
        }}
      >
        {children}
      </Tooltip.Trigger>
      {!suspended && (
        <Tooltip.Portal>
          <Tooltip.Content
            className={styles.tooltip}
            style={{ fontFamily }}
            side="top"
            sideOffset={8}
            updatePositionStrategy="always"
            collisionPadding={8}
            hideWhenDetached
            onEscapeKeyDown={(event) => event.stopPropagation()}
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  )
}
