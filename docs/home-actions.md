# Inline home actions

`src/components/home-actions.tsx` owns the shared presentation contract. The
homepage supplies localized labels and feature content. Scheduling, role
comparison, and the guestbook use this inline action contract.

## API

`HomeActions` receives `actions: readonly HomeAction[]`, `closeLabel: string`,
and optional `initialAction: string | null` (an existing panel ID).
Each action has a stable, locale-independent `id` and `label`, plus either
`content: ReactNode` for a panel or `href: string` for a transitional link.
Do not supply both. Use one instance on the homepage; IDs must be unique.

To migrate another action, replace its `href` entry in `src/app/page.tsx` with
`content` containing its feature component. Keep feature validation, requests,
loading, errors and results inside that component. Pass serializable props or
rendered React content across the server/client boundary, not render callbacks.
Nested client components can use `useHomeActions` to open or close a panel. This
keeps focus on the destination trigger and avoids route navigation. Its
`activeAction` property exposes the currently open ID; data-backed panels can
wait until they are opened before fetching.

## Interaction contract

- One panel is open at a time, below the action row, within normal page flow.
- While an action is open, the rest of the homepage blurs/dims gently. The
  entire action row and panel remain sharp. Background regions regain clarity
  when they contain keyboard focus; they remain interactive, not inert.
  Project/experience disclosures still dim only their own siblings.
- Panels stay mounted while collapsed: local drafts and request results survive
  closing/reopening and switching panels during the current page lifetime. This
  is not persistence across reloads.
- Closed panels are inert and hidden from assistive technology. Triggers expose
  `aria-expanded` and `aria-controls`; panels are labelled regions.
- Opening leaves focus on the trigger. Tab reaches the panel after the action
  row. Explicit close returns focus to its trigger without forced scrolling.
- Escape closes only while focus is within the action group; nested controls can
  prevent its default behavior. Outside clicks do not dismiss forms.
- Opening uses `src/lib/action-viewport.ts` to accommodate the action within
  the visible viewport over 400ms. An already visible panel does not scroll;
  a fitting panel is centered where scroll bounds allow, and a tall one aligns
  near the top. Scroll follows the panel's measured height so centering and
  expansion share a single rhythm, with no added blank space.
  Wheel, touch, pointer, keyboard, external scrolling or viewport resizing
  cancels the adjustment. Field edits and results never trigger recentering.
- Progressive results may follow their growing bottom edge only while the
  visitor has not taken control of the viewport. Wheel, touch, pointer, keyboard,
  external scroll or viewport resizing cancels that following for the rest of
  the response. It never resumes automatically or recenters the result.
- Closing releases only the scroll distance that will no longer fit in the
  shortened page, following the panel's height. Native scroll clamping at the
  page end does not cancel this adjustment; manual input still does. Closing
  never restores a saved scroll position. Projects and experiences share this
  release behavior. On opening, their heading and expanded content are
  accommodated together: leave a fully visible item still, center one that
  fits, and align long content near the top. A shrinking previous sibling is
  accounted for in the same adjustment so switching items retains the heading
  as a reading reference. All adjustments yield to manual interaction.
- Layout uses 400ms ease-in-out with a separate 160ms opacity transition;
  the content retains its restrained bounce. Reversing a toggle continues from
  the current rendered height. Intrinsic height excludes decorative transforms;
  reduced motion disables transitions. There is no nested scroll container.
- Scheduling, role-comparison, and guestbook validation use a 150ms ease-out color and
  message transition. Their feedback rows expand or collapse over 180ms so
  nearby fields and actions move continuously instead of jumping. Messages use
  opacity and a 2px offset without bounce; reduced motion is immediate.
- The close control follows content. Future long results should add an accessible
  close control near their beginning too, without creating a separate overlay.

## Schedule integration

The `/schedule` and `/fit` pages were removed, without redirects or fallbacks,
per the user's explicit instruction. Access is through the homepage actions.
Regular toggles use local state without URL/history changes. The old routes are
absent from the sitemap.

The scheduler retains `/api/meetings`, validation, idempotency, timezone handling,
submission states and confirmation behavior. Controls use subtle pill-shaped neutral
surfaces, visible focus outlines, persistent labels and 16px input text inheriting the homepage font; typed
values retain their casing. The submit button follows the soft rounded link style.
No calendar availability logic was added.

## Role comparison integration

Role comparison retains `/api/fit`, input guardrails, request limits, errors and
the progressive word reveal. Its textarea and actions follow the scheduler's
soft neutral control treatment. The draft and latest result stay mounted while
the panel is collapsed. A completed comparison can open scheduling directly;
focus moves to the scheduling trigger before the role panel becomes inert.

When extending, verify typecheck, targeted lint and relevant existing tests.
Check browser behavior only when authorized, especially draft retention, focus,
native date/select controls, mobile width and scroll during collapse.

## Guestbook integration

The guestbook uses the same mounted panel contract. It fetches its first page
only after opening; collapsing keeps the draft and loaded history. Public
messages lead the panel. The composer stays mounted inside a second disclosure
below them, collapsed by default, and uses the same 400ms layout and 160ms fade
cadence as the parent panel. Its opening and closing share the viewport
accommodation behavior. Name and message fields use the shared feedback
components, and the resizable message field is capped at 16rem. Publication
feedback and new message rows use 180ms grid-height transitions with 150ms
opacity/2px offset, without bounce and with reduced-motion support. The parent
panel supplies the single close control after all content; the guestbook does
not duplicate it at the top. See [Guestbook](guestbook.md) for its API, cookie,
moderation, migration and delivery contracts.
