type DockRect = { top: number; bottom: number; width: number }

/** A smaller exit margin avoids oscillating between modes near the viewport edge. */
export function shouldDockToolbar(
  slot: DockRect,
  viewport: { top: number; bottom: number },
  docked: boolean,
) {
  const margin = docked ? 12 : 24
  return (
    slot.width >= 200 &&
    slot.top >= viewport.top + margin &&
    slot.bottom <= viewport.bottom - margin
  )
}

export function toolbarPresentation(docked: boolean, minimized: boolean) {
  return docked ? 'docked' : minimized ? 'minimized' : 'floating'
}

export function toolbarMovement(
  before: { left: number; top: number; width: number },
  after: { left: number; top: number; width: number },
) {
  return {
    x: before.left + before.width / 2 - after.left - after.width / 2,
    y: before.top - after.top,
  }
}
