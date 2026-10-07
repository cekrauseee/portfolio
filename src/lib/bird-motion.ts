import { motion } from './motion'

export type BirdPoint = { x: number; y: number }
export type BirdFlight = BirdPoint & { vx: number; vy: number }
export type BirdBounds = { left: number; right: number; top: number; bottom: number }
export type BirdPointer = BirdPoint & {
  at: number
  noticedAt: number
  origin: BirdPoint
  engaged: boolean
}

export const birdPointerIdle = 900

/** Notice first; a short, isolated nudge never becomes an invitation to follow. */
export function noticeBirdPointer(
  previous: BirdPointer | null,
  point: BirdPoint,
  now: number,
): BirdPointer {
  const continuing =
    previous &&
    now - previous.at < birdPointerIdle &&
    (previous.engaged || now - previous.at < motion.duration.control)
      ? previous
      : null
  const origin = continuing?.origin ?? point
  const noticedAt = continuing?.noticedAt ?? now
  return {
    ...point,
    at: now,
    origin,
    noticedAt,
    engaged:
      !!continuing?.engaged ||
      (now - noticedAt >= motion.duration.control &&
        Math.hypot(point.x - origin.x, point.y - origin.y) >= 24),
  }
}

/** Expired pointer input and scrolling always yield to the page's resting place. */
export function birdAttention(pointer: BirdPointer | null, now: number, scrollUntil: number) {
  return pointer && now - pointer.at < birdPointerIdle && now >= scrollUntil ? pointer : null
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Landing zones flank the centered text column; flight can cross between them. */
export function birdMargin(
  textLeft: number,
  width: number,
  height: number,
  top = 0,
  bottomInset = 16,
) {
  const size = width < 680 ? 28 : 48
  return {
    size,
    bounds: {
      left: 2,
      right: width - size - 2,
      top: top + 8,
      bottom: Math.max(top + 8, top + height - size - bottomInset),
    },
    perches: {
      left: Math.max(2, textLeft - size - 12),
      right: Math.min(width - size - 2, width - textLeft + 12),
    },
  }
}

export function boundBird(point: BirdPoint, bounds: BirdBounds): BirdPoint {
  return {
    x: clamp(point.x, bounds.left, bounds.right),
    y: clamp(point.y, bounds.top, bounds.bottom),
  }
}

/** Keep narration in a quiet reading band, including gaps between spoken words. */
export function birdReadingPerch(
  wordBottom: number | null,
  previous: number,
  size: number,
  bounds: BirdBounds,
) {
  const height = bounds.bottom - bounds.top
  return clamp(
    wordBottom === null ? previous : wordBottom - size + 2,
    bounds.top + height * 0.26,
    bounds.top + height * 0.4,
  )
}

/** Exact critically damped spring: preserve velocity when the destination changes. */
export function advanceBird(
  flight: BirdFlight,
  target: BirdPoint,
  seconds: number,
  crossing = false,
): BirdFlight {
  // Only crossing the text column needs extra travel time; local following stays quick.
  const speed = 4 / ((motion.duration.page / 1000) * (crossing ? 1.6 : 1))
  const decay = Math.exp(-speed * seconds)
  const axis = (position: number, velocity: number, destination: number) => {
    const offset = position - destination
    const momentum = velocity + speed * offset
    return {
      position: destination + (offset + momentum * seconds) * decay,
      velocity: (velocity - speed * momentum * seconds) * decay,
    }
  }
  const x = axis(flight.x, flight.vx, target.x)
  const y = axis(flight.y, flight.vy, target.y)
  return { x: x.position, y: y.position, vx: x.velocity, vy: y.velocity }
}
