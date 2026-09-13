'use client'

import { useState, type ReactNode } from 'react'

export function NotePageEntrance({ children }: { children: ReactNode }) {
  // CSS starts with the server HTML, before hydration. Keep this decision for
  // the page's lifetime so finishing a route transition cannot replay entry.
  const [animateEntry] = useState(
    () => typeof document === 'undefined' || !document.documentElement.dataset.noteTransition,
  )

  return (
    <main
      data-note-page
      data-note-entry={animateEntry}
      className="h-dvh [scrollbar-width:none] overflow-y-auto overscroll-contain [overflow-anchor:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </main>
  )
}
