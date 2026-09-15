import { noteHeaderIsVisible, noteViewport } from './route-restoration'
import { motion } from '@/lib/motion'

type Direction = 'open' | 'close'
type Kind = 'container' | 'text' | 'body' | 'toolbar' | 'above' | 'below' | 'page' | 'return-card'

/** Navigation is asynchronous, including cached history traversal. */
export function createNoteTransitionGate(target: string) {
  let resolve: () => void
  let settled = false
  const ready = new Promise<void>((done) => {
    resolve = done
  })
  return {
    ready,
    commit(pathname: string) {
      if (settled || pathname !== target) return false
      settled = true
      resolve()
      return true
    },
    cancel() {
      settled = true
      resolve()
    },
  }
}

export function noteContextSide(blockCenter: number, noteCenter: number): 'above' | 'below' {
  return blockCenter < noteCenter ? 'above' : 'below'
}

export function noteBodyOffset(
  from: Pick<DOMRect, 'left' | 'bottom'>,
  to: Pick<DOMRect, 'left' | 'bottom'>,
  direction: Direction,
) {
  const sign = direction === 'open' ? 1 : -1
  return { x: (from.left - to.left) * sign, y: (from.bottom - to.bottom) * sign }
}

export function toolbarRevealInsets(width: number, height: number) {
  return { x: Math.max(0, (width - 36) / 2), y: Math.max(0, (height - 28) / 2) }
}

type Run = {
  slug: string
  target: string
  direction: Direction
  native: boolean
  gate: ReturnType<typeof createNoteTransitionGate>
  transition?: ViewTransition
  timer?: ReturnType<typeof setTimeout>
  styles: Map<HTMLElement, { name: string; kind: string }>
  elements: Map<HTMLElement, Kind>
  animations: Animation[]
  cleaned: boolean
  matchHeader: boolean
  headerAnchor?: Pick<DOMRect, 'left' | 'bottom'>
}
let active: Run | null = null

function visibleElement(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
    (element) => element.getClientRects().length > 0,
  )
}

function mark(run: Run, element: HTMLElement | undefined | null, name: string, kind: Kind) {
  if (!element) return
  if (!run.styles.has(element)) {
    run.styles.set(element, {
      name: element.style.getPropertyValue('view-transition-name'),
      kind: element.style.getPropertyValue('view-transition-class'),
    })
  }
  element.style.setProperty('view-transition-name', name)
  element.style.setProperty('view-transition-class', `note-${kind}`)
  run.elements.set(element, kind)
}

function prepareScene(run: Run, entering = false) {
  const article = visibleElement(`[data-note-card="${run.slug}"]`)
  if (!article) {
    const main = visibleElement('main')
    mark(
      run,
      main?.querySelector<HTMLElement>('[data-locale-content]') ?? main,
      'note-context-fallback',
      'below',
    )
    return
  }
  const closing = run.direction === 'close'
  const header = article.querySelector<HTMLElement>('[data-note-header]')
  if (closing && !entering) {
    run.matchHeader =
      !!header && noteHeaderIsVisible(header.getBoundingClientRect(), noteViewport(header))
    // Capture the scrollport, not the full article: its size stays bounded even
    // at the end of a long note. Never scroll the reader back up to close it.
    mark(run, article.closest<HTMLElement>('main'), 'note-outgoing-page', 'page')
  }
  if (!closing || entering || run.matchHeader) {
    mark(
      run,
      closing ? header : article,
      'note-active',
      closing && !run.matchHeader ? 'return-card' : 'container',
    )
    if (!closing) {
      const headerAnchor = article
        .querySelector<HTMLElement>('[data-note-shared="date"]')
        ?.getBoundingClientRect()
      if (headerAnchor) {
        if (!run.headerAnchor) run.headerAnchor = headerAnchor
        else {
          const offset = noteBodyOffset(run.headerAnchor, headerAnchor, run.direction)
          document.documentElement.style.setProperty('--note-body-x', offset.x + 'px')
          document.documentElement.style.setProperty('--note-body-y', offset.y + 'px')
        }
      }
      mark(
        run,
        article.querySelector<HTMLElement>('[data-open="true"]'),
        'note-active-body',
        'body',
      )
    }
    if (!closing || run.matchHeader) {
      for (const part of ['title', 'summary', 'date']) {
        mark(
          run,
          article.querySelector<HTMLElement>(`[data-note-shared="${part}"]`),
          `note-active-${part}`,
          'text',
        )
      }
    }
  }
  const toolbar = visibleElement('[data-note-reading-toolbar]')?.querySelector<HTMLElement>(
    '[data-note-toolbar-surface]',
  )
  mark(run, toolbar, 'note-active-toolbar', 'toolbar')
  if (toolbar) {
    const rect = toolbar.getBoundingClientRect()
    const inset = toolbarRevealInsets(rect.width, rect.height)
    document.documentElement.style.setProperty('--note-toolbar-inset-x', inset.x + 'px')
    document.documentElement.style.setProperty('--note-toolbar-inset-y', inset.y + 'px')
  }

  if (closing && !entering) return

  const origin = article.getBoundingClientRect()
  let branch: HTMLElement = article
  let index = 0
  while (branch.parentElement) {
    const parent = branch.parentElement
    for (const sibling of Array.from(parent.children)) {
      if (
        !(sibling instanceof HTMLElement) ||
        sibling === branch ||
        sibling.matches('script, style, [data-note-reading-toolbar]')
      )
        continue
      const rect = sibling.getBoundingClientRect()
      if (!rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight) continue
      mark(
        run,
        sibling,
        `note-context-${index++}`,
        noteContextSide(rect.top + rect.height / 2, origin.top + origin.height / 2),
      )
    }
    if (parent.tagName === 'MAIN') break
    branch = parent
  }
}

function clean(run: Run) {
  if (run.cleaned) return
  run.cleaned = true
  clearTimeout(run.timer)
  run.animations.forEach((animation) => animation.cancel())
  for (const [element, before] of run.styles) {
    for (const [property, value] of [
      ['view-transition-name', before.name],
      ['view-transition-class', before.kind],
    ]) {
      if (value) element.style.setProperty(property, value)
      else element.style.removeProperty(property)
    }
  }
  if (active === run) {
    document.documentElement.style?.removeProperty('--note-body-x')
    document.documentElement.style?.removeProperty('--note-body-y')
    document.documentElement.style?.removeProperty('--note-toolbar-inset-x')
    document.documentElement.style?.removeProperty('--note-toolbar-inset-y')
    delete document.documentElement.dataset.noteTransition
    active = null
  }
}

async function fallbackMotion(run: Run, entering: boolean) {
  const animations: Animation[] = []
  for (const [element, kind] of run.elements) {
    if (
      !element.isConnected ||
      !element.getClientRects().length ||
      kind === 'text' ||
      kind === 'body' ||
      typeof element.animate !== 'function'
    )
      continue
    // The closing page already contains its header; animate that branch once.
    if (!entering && run.direction === 'close' && kind === 'container') continue
    const contextDistance = motion.distance.context
    const offset =
      kind === 'above'
        ? -contextDistance
        : kind === 'below'
          ? contextDistance
          : kind === 'toolbar'
            ? motion.distance.enter
            : kind === 'page'
              ? -motion.distance.exit
              : kind === 'return-card'
                ? motion.distance.exit
                : 0
    const states = [
      {
        opacity: 0,
        transform: `translateY(${offset}px)`,
        transformOrigin: 'top left',
      },
      { opacity: 1, transform: 'translateY(0)', transformOrigin: 'top left' },
    ]
    const animation = element.animate(entering ? states : states.toReversed(), {
      duration:
        kind === 'toolbar'
          ? motion.duration.control
          : kind === 'page'
            ? motion.duration.settle
            : entering
              ? motion.duration.page
              : motion.duration.settle,
      easing: motion.easing,
      fill: 'both',
    })
    animations.push(animation)
    run.animations.push(animation)
  }
  await Promise.allSettled(animations.map((animation) => animation.finished))
}

export function isNoteTransitionTo(pathname: string) {
  return active?.target === pathname
}

/** Capture before dispatching push/back; release only after the destination's layout and scroll. */
export function startNoteRouteTransition(
  slug: string,
  direction: Direction,
  target: string,
  navigate: () => void,
) {
  if (active?.target === target) return
  if (active) {
    active.transition?.skipTransition()
    active.gate.cancel()
    clean(active)
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate()
    return
  }
  const run: Run = {
    slug,
    direction,
    target,
    native:
      typeof document.startViewTransition === 'function' &&
      CSS.supports('view-transition-class', 'note-container'),
    gate: createNoteTransitionGate(target),
    styles: new Map(),
    elements: new Map(),
    animations: [],
    cleaned: false,
    matchHeader: true,
  }
  active = run
  document.documentElement.dataset.noteTransition = direction
  prepareScene(run)
  let dispatched = false
  const dispatch = () => {
    if (dispatched || active !== run) return
    dispatched = true
    navigate()
  }
  // Never leave a slow or failed navigation behind a frozen snapshot.
  run.timer = setTimeout(() => {
    dispatch()
    run.gate.cancel()
    run.transition?.skipTransition()
    clean(run)
  }, 5000)

  if (run.native) {
    try {
      run.transition = document.startViewTransition(async () => {
        if (active !== run) return
        dispatch()
        await run.gate.ready
      })
      void run.transition.ready.catch(() => {})
      void run.transition.finished.then(
        () => clean(run),
        () => clean(run),
      )
      return
    } catch {
      run.native = false
      if (dispatched) return
    }
  }
  void fallbackMotion(run, false)
    .then(dispatch)
    .catch(() => clean(run))
}

/** Called after React's layout effects, including portal mounting and scroll restore. */
export function completeNoteRouteTransition(pathname: string) {
  const run = active
  if (!run || run.target !== pathname) return
  prepareScene(run, true)
  if (!run.gate.commit(pathname)) return
  clearTimeout(run.timer)
  if (!run.native) void fallbackMotion(run, true).then(() => clean(run))
}
