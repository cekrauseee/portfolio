import { toolbarMovement } from './toolbar-docking'
import { motion } from '@/lib/motion'

// One owner for layout motion. CSS keeps hover, color and visibility transitions.
const parts = [
  ['[data-note-toolbar-surface]', ['width', 'height', 'padding', 'gap', 'borderRadius']],
  ['[data-note-toolbar-controls]', ['gridTemplateColumns', 'opacity']],
  ['[data-note-toolbar-row]', ['gap']],
  ['button', ['height', 'flexBasis']],
  ['[data-note-toolbar-minimize]', ['width', 'opacity']],
  [
    '[data-note-toolbar-separator]',
    ['flexBasis', 'marginInlineStart', 'marginInlineEnd', 'opacity'],
  ],
] as const

export function captureToolbarLayout(toolbar: HTMLElement, surface: HTMLElement) {
  return {
    rect: surface.getBoundingClientRect(),
    parts: parts.flatMap(([selector, properties]) =>
      Array.from(toolbar.querySelectorAll<HTMLElement>(selector), (element) => {
        const style = getComputedStyle(element)
        return {
          element,
          frame: Object.fromEntries(properties.map((property) => [property, style[property]])),
        }
      }),
    ),
  }
}

export type ToolbarLayout = ReturnType<typeof captureToolbarLayout>

export function animateToolbarLayout(
  toolbar: HTMLElement,
  surface: HTMLElement,
  before: ToolbarLayout,
) {
  // Callers cancel the previous run first. With no CSS layout transitions, the
  // live DOM now exposes the destination without cloning or moving its buttons.
  const after = captureToolbarLayout(toolbar, surface)
  const movement = toolbarMovement(before.rect, after.rect)
  const options = { duration: motion.duration.control, easing: motion.easing }
  const startTime = document.timeline.currentTime
  // The floating bottom anchor must not move as the surface changes height.
  toolbar.style.height = after.rect.height + 'px'
  const animations = [
    toolbar.animate(
      [{ translate: `${movement.x}px ${movement.y}px` }, { translate: '0px 0px' }],
      options,
    ),
    ...after.parts.flatMap(({ element, frame }) => {
      const start = before.parts.find((part) => part.element === element)?.frame
      if (!start || Object.keys(frame).every((key) => start[key] === frame[key])) {
        return []
      }
      return [element.animate([start, frame], options)]
    }),
  ]
  for (const animation of animations) {
    animation.startTime = startTime
  }
  let cancelled = false
  const cancel = () => {
    if (cancelled) {
      return
    }
    cancelled = true
    animations.forEach((animation) => animation.cancel())
    toolbar.style.height = ''
  }
  return {
    cancel,
    finished: Promise.all(animations.map((animation) => animation.finished)).then(cancel, cancel),
  }
}
