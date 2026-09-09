# Inline home actions

`src/components/home-actions.tsx` owns the shared presentation contract. The
homepage supplies localized labels and feature content. Schedule is the first
inline action; fit and guestbook remain links until their separate migrations.

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

## Interaction contract

- One panel is open at a time, below the action row, within normal page flow.
- While an action is open, the rest of the homepage blurs/dims gently. The
  entire action row and panel remain sharp. Background regions regain clarity
  when they contain keyboard focus; they remain interactive, not inert.
  Project/experience disclosures still dim only their own siblings.
- Panels stay mounted while collapsed: local drafts and request results survive
  closing/reopening and switching panels during the current page lifetime.
  This is not persistence across reloads or navigation to remaining legacy pages.
- Closed panels are inert and hidden from assistive technology. Triggers expose
  `aria-expanded` and `aria-controls`; panels are labelled regions.
- Opening leaves focus on the trigger. Tab reaches the panel after the action
  row. Explicit close returns focus to its trigger without forced scrolling.
- Escape closes only while focus is within the action group; nested controls can
  prevent its default behavior. Outside clicks do not dismiss forms.
- Opening uses `src/lib/action-viewport.ts` to accommodate the action within
  the visible viewport over 500ms. An already visible panel does not scroll;
  a fitting panel is centered where scroll bounds allow, and a tall one aligns
  near the top. Scroll is clamped naturally, with no added blank space.
  Wheel, touch, pointer, keyboard, external scrolling or viewport resizing
  cancels the adjustment. Field edits and results never trigger recentering.
- Height/opacity transitions and restrained translation match the homepage;
  reduced motion disables transitions. There is no nested scroll container.
- The close control follows content. Future long results should add an accessible
  close control near their beginning too, without creating a separate overlay.

## Schedule integration

The `/schedule` page was removed, without a redirect or fallback, per the user's
explicit instruction. Access is through the homepage action. Regular toggles use
local state without URL/history changes. The old route is absent from the sitemap.
Other legacy action routes are unchanged.

The scheduler retains `/api/meetings`, validation, idempotency, timezone handling,
submission states and confirmation behavior. Controls use subtle pill-shaped neutral
surfaces, visible focus outlines, persistent labels and 16px input text inheriting the homepage font; typed
values retain their casing. The submit button follows the soft rounded link style.
No calendar availability logic was added.

When extending, verify typecheck, targeted lint and relevant existing tests.
Check browser behavior only when authorized, especially draft retention, focus,
native date/select controls, mobile width and scroll during collapse.
