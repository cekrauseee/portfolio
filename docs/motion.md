# Motion

Use [the shared motion tokens](../src/lib/motion.ts) for transitions and animation timing.
The root layout renders their CSS variables on `<html>` before hydration, including
for direct note visits and portaled controls. JavaScript animations import the same values.

| Token      | Duration | Use                                                                           |
| ---------- | -------- | ----------------------------------------------------------------------------- |
| `feedback` | 150 ms   | Hover, focus colors, labels, reading highlights and tooltips                  |
| `settle`   | 180 ms   | Small layout changes, feedback rows, dimming and content exits                |
| `control`  | 300 ms   | Icon swaps, toolbar layout, theme changes and translated note content         |
| `page`     | 360 ms   | Page entrances, route transitions, expanding panels and their scroll tracking |

All use `motion.easing`, a decelerating curve without overshoot. Frame-driven reading
scrolls use `easeMotion()` to sample that same curve. Panel scroll tracking follows
the rendered geometry and uses `motion.duration.page` as its completion deadline.
Keep network timeouts, audio timestamps and reading-idle delays independent of these tokens.

## CSS and components

Use explicit properties with `duration-(--motion-feedback)` and `ease-standard`,
or the corresponding duration token. A panel can use
`duration-[var(--motion-page),var(--motion-settle)]` for geometry and opacity.
Do not introduce local numeric durations or a second easing curve.

Entrances rise gently; exits use a shorter movement. Press feedback uses
`motion-safe:active:scale-(--motion-press-scale)` (0.96). Avoid scaling text during
page entrances or panel expansion. Route geometry can travel farther to preserve
the relationship between a note and its card; do not replace those measured offsets
with decorative movement.

Keep entrance sequences bounded: header first, sections after 90 ms, list items
25 ms apart, with delays capped at 240 ms. Nested list fades and rises share
`--motion-entry-delay`. Use no stagger for routine controls or repeated interactions.
Returning home suppresses its initial entrance because the route transition already
represents it. A note closed from deep scroll exits through its visible viewport.

Opening an inline section from a hash moves the viewport and expands the panel
together on the `page` clock. The item stays in document flow, so its neighbors
move with it. Distant destinations start near their final position: the whole
page is hidden during that repositioning, then appears with a short approach
and the item's expansion on the same clock. Do not traverse the entire page
or jump to the destination and then fade only the selected item in,
or apply a separate header/content cascade to this interaction. Hash-addressable
action names must not also be native fragment anchors that scroll before the controller.

Decorative icon swaps use `motion-icon` and `data-active`: opacity, scale 0.25→1
and blur 4→0 px. Both icons stay mounted; the button retains its accessible name,
focus and event handlers. No entrance animation runs merely because an icon mounts.

## Reduced motion and interruption

Keep `motion-reduce:transition-none` / `motion-reduce:animate-none` on Tailwind
motion, the existing reduced-motion CSS rules, and preference checks in JavaScript.
Icon swaps become instant and scrolling corrections remain functional. Cancel
superseded animations; never delay navigation or leave content hidden when motion is disabled.

`tests/motion.test.mjs` checks token availability before hydration, CSS/JavaScript
timing agreement, curve bounds, and prevents numeric duration/easing drift in source.
The existing route, scroll, locale, theme and control tests cover their behavior.

## Resident bird

`PixelBird` lives in the root layout, outside the clipped scrolling content. Its
pixel SVG follows the pointer throughout the available margin, crosses sides after
a brief dwell beyond the column's center, and accompanies scrolling. A temporary
branch unfolds at the landing point as the bird approaches, yields slightly on
landing, and retracts when it leaves. Branches are separate from the moving sprite;
their width adapts to the available margin.

Pointer attention expires after 0.9 seconds and is released immediately when the
pointer leaves the window, the window loses focus, scrolling starts, or a form field
receives focus. The bird blends back to a nearby visible heading instead of
remaining at the pointer's last coordinates. Notes suppress vertical pointer
following. After 4.5 seconds without interaction it sleeps with pixel Zs.

Returning cursor activity first raises the bird's attention while it stays perched:
a brief pixel exclamation and sparks appear once, with a head lift and tail flick.
Following requires at least 24 pixels of movement over the shared control duration (300 ms);
isolated nudges do not accumulate. Once engaged, following keeps its quick response
until the pointer is released.

During note narration, the bird opens a pixel book beside the active paragraph.
The reader's `data-note-audio-state` and existing `data-note-state="current"` word
markers identify the active paragraph. The reading pose and its gentle continuous
gesture remain stable between words and during scrolling; the last spoken word is
retained through gaps. The perch stays within the reading band, without falling
back to a heading when no word is highlighted. Pausing, buffering, ending,
changing language, or leaving the note ends the reading pose. This decoration
never controls playback or the reading camera.

A critically damped spring preserves velocity when the destination changes. Local
following uses the shared page duration; crossing the column uses 1.6 times that
response time, returning to the faster response on approach. The climb and descent
go through the same spring, without adding offsets to the rendered position.
Sprite cycles derive from the existing motion tokens.

The `portfolio-bird` view-transition name carries the same bird across note routes;
its destination is measured after note scroll restoration. Ordinary route changes
use the same persistent flight controller. Animation frames stop when settled,
hidden, or in a background tab. Reduced motion leaves a static bird in the margin.
The localized footer preference hides it and remembers the choice in local storage.
