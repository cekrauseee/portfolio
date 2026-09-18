'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import Link from 'next/link'
import { useCollapsibleHash } from '@/lib/use-collapsible-hash'
import { accommodateReadyContent } from '@/lib/viewport-scroll'
import { releaseCollapsedViewport } from '@/lib/viewport-scroll'
import {
  dismissSoundProps,
  linkSoundProps,
  quietLinkClassName,
  softLinkClassName,
  disclosureSoundProps,
} from '@/components/links'

export type HomeAction = { id: string; label: string } & (
  { content: ReactNode; href?: never } | { href: string; content?: never }
)

type HomeActionsContextValue = {
  activeAction: string | null
  closeAction: (id: string) => void
  openAction: (id: string) => void
}

const HomeActionsContext = createContext<HomeActionsContextValue | null>(null)

export function useHomeActions() {
  const context = useContext(HomeActionsContext)
  if (!context) {
    throw new Error('useHomeActions must be used within HomeActions')
  }
  return context
}

/** Stable IDs preserve each mounted panel's draft while it is collapsed. */
export function HomeActions({
  actions,
  closeLabel,
}: {
  actions: readonly HomeAction[]
  closeLabel: string
}) {
  const [active, setActive, fromHash] = useCollapsibleHash(
    '',
    actions.filter((action) => action.href === undefined).map((action) => action.id),
  )
  const root = useRef<HTMLDivElement>(null)
  const previousAction = useRef<string | null>(null)
  useLayoutEffect(() => {
    const previous = previousAction.current
    const panelId = active ?? previous
    previousAction.current = active
    if (!panelId || !root.current) {
      return
    }
    if (!active && fromHash && window.location.hash) return
    const panel = document.getElementById(`action-${panelId}-panel`)
    if (panel) {
      return active
        ? accommodateReadyContent(
            root.current,
            panel,
            previous !== null,
            fromHash ? 'hash' : 'expand',
          )
        : releaseCollapsedViewport(root.current, panel)
    }
  }, [active, setActive, fromHash])

  useEffect(() => {
    if (!active) {
      return
    }

    function handleClick(event: MouseEvent) {
      if (
        !root.current ||
        !(event.target instanceof Element) ||
        root.current.contains(event.target)
      ) {
        return
      }

      const collapsibleTrigger = event.target.closest(
        '[id^="project-"][id$="-trigger"], [id^="experience-"][id$="-trigger"]',
      )
      if (collapsibleTrigger) {
        // Keep action panels mounted so their drafts and results survive this
        // visual close while the selected project or experience opens.
        setActive(null)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [active, setActive])

  const triggers = useRef(new Map<string, HTMLButtonElement>())

  function close(id: string) {
    triggers.current.get(id)?.focus({ preventScroll: true })
    setActive(null)
  }

  function open(id: string) {
    if (!actions.some((action) => action.id === id && action.href === undefined)) {
      return
    }
    triggers.current.get(id)?.focus({ preventScroll: true })
    setActive(id)
  }

  return (
    <HomeActionsContext.Provider
      value={{ activeAction: active, closeAction: close, openAction: open }}
    >
      <div
        ref={root}
        data-action-background
        data-action-open={active !== null}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.defaultPrevented && active) {
            event.stopPropagation()
            close(active)
          }
        }}
      >
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {actions.map((action) => (
            <span
              key={action.id}
              className={`hover:blur-0 focus-within:blur-0 ease-standard transition-[filter,opacity] duration-(--motion-settle) focus-within:opacity-100 hover:opacity-100 motion-reduce:transition-none ${active !== null && active !== action.id && action.href !== undefined ? 'opacity-35 blur-[1.5px]' : 'blur-0 opacity-100'}`}
            >
              {action.href !== undefined ? (
                <Link {...linkSoundProps} className={quietLinkClassName} href={action.href}>
                  {action.label}
                </Link>
              ) : (
                <button
                  {...disclosureSoundProps(active === action.id)}
                  type="button"
                  id={`action-${action.id}-trigger`}
                  ref={(node) => {
                    if (node) {
                      triggers.current.set(action.id, node)
                    } else {
                      triggers.current.delete(action.id)
                    }
                  }}
                  aria-expanded={active === action.id}
                  aria-controls={`action-${action.id}-panel`}
                  className={`${quietLinkClassName} cursor-pointer text-left decoration-1 underline-offset-[0.28em] aria-expanded:text-black aria-expanded:underline dark:aria-expanded:text-white`}
                  onClick={() => setActive(active === action.id ? null : action.id)}
                >
                  {action.label}
                </button>
              )}
            </span>
          ))}
        </div>
        {actions.map((action) =>
          action.href === undefined ? (
            <section
              key={action.id}
              id={`action-${action.id}-panel`}
              data-collapsible-panel
              aria-labelledby={`action-${action.id}-trigger`}
              aria-hidden={active !== action.id}
              inert={active !== action.id ? true : undefined}
              className={`ease-standard grid transition-[grid-template-rows,opacity] duration-[var(--motion-page),var(--motion-settle)] motion-reduce:transition-none ${active === action.id ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}
            >
              <div className="min-h-0 overflow-x-visible overflow-y-clip">
                <div
                  className={`ease-standard pt-6 pb-1 transition-transform duration-(--motion-page) motion-reduce:transform-none motion-reduce:transition-none ${active === action.id ? 'translate-y-0' : 'translate-y-(--motion-rise)'}`}
                >
                  {action.content}
                  <button
                    {...dismissSoundProps}
                    type="button"
                    className={`${softLinkClassName} mt-4 -ml-4 cursor-pointer`}
                    onClick={() => close(action.id)}
                  >
                    {closeLabel}
                  </button>
                </div>
              </div>
            </section>
          ) : null,
        )}
      </div>
    </HomeActionsContext.Provider>
  )
}
