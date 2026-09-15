'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startNoteRouteTransition } from '@/features/notes/route-transition'
import type { ReactNode } from 'react'
import { focusVisibleClassName, linkSoundProps } from '@/components/links'
import { getViewportScroller } from '@/lib/viewport-scroll'
import { rememberNoteReturn } from '@/features/notes/navigation'

export function NoteRouteLink({ slug, children }: { slug: string; children: ReactNode }) {
  const router = useRouter()
  return (
    <Link
      {...linkSoundProps}
      href={`/notes/${slug}`}
      prefetch={true}
      data-note-link={slug}
      className={`${focusVisibleClassName} block lowercase`}
      onNavigate={(event) => {
        event.preventDefault()
        startNoteRouteTransition(slug, 'open', '/notes/' + slug, () =>
          router.push('/notes/' + slug),
        )
      }}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        const scroller = getViewportScroller(event.currentTarget)
        rememberNoteReturn({
          slug,
          scrollTop: scroller.scrollTop,
          triggerTop: event.currentTarget.getBoundingClientRect().top,
        })
      }}
    >
      {children}
    </Link>
  )
}
