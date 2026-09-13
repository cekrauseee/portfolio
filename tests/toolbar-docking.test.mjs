import assert from 'node:assert/strict'
import test from 'node:test'
import {
  shouldDockToolbar,
  toolbarPresentation,
  toolbarMovement,
} from '../src/features/notes/toolbar-docking.ts'

const viewport = { top: 0, bottom: 800 }

test('toolbar docks only when the whole footer slot has comfortable visible space', () => {
  assert.equal(shouldDockToolbar({ top: 700, bottom: 748, width: 464 }, viewport, false), true)
  assert.equal(shouldDockToolbar({ top: 740, bottom: 788, width: 464 }, viewport, false), false)
  assert.equal(shouldDockToolbar({ top: -10, bottom: 38, width: 464 }, viewport, false), false)
  assert.equal(shouldDockToolbar({ top: 700, bottom: 748, width: 180 }, viewport, false), false)
})

test('separate entry and exit margins prevent flickering around the docking threshold', () => {
  const slot = { top: 732, bottom: 780, width: 464 }
  assert.equal(shouldDockToolbar(slot, viewport, false), false)
  assert.equal(shouldDockToolbar(slot, viewport, true), true)
  assert.equal(shouldDockToolbar({ ...slot, bottom: 790 }, viewport, true), false)
  assert.equal(shouldDockToolbar({ top: 10, bottom: 58, width: 464 }, viewport, true), false)
})

test('docking accounts for an offset or resized visual viewport', () => {
  assert.equal(
    shouldDockToolbar({ top: 150, bottom: 198, width: 300 }, { top: 100, bottom: 700 }, false),
    true,
  )
  assert.equal(
    shouldDockToolbar({ top: 150, bottom: 198, width: 300 }, { top: 140, bottom: 700 }, false),
    false,
  )
})

test('a minimized toolbar expands while docked and returns minimized without changing the preference', () => {
  const preference = true
  assert.equal(toolbarPresentation(false, preference), 'minimized')
  assert.equal(toolbarPresentation(true, preference), 'docked')
  assert.equal(toolbarPresentation(false, preference), 'minimized')
  assert.equal(toolbarPresentation(false, false), 'floating')
})

test('layout movement preserves the displayed center while the toolbar changes width', () => {
  const compact = { left: 382, top: 760, width: 36 }
  const docked = { left: 168, top: 700, width: 464 }
  assert.deepEqual(toolbarMovement(compact, docked), { x: 0, y: 60 })
  assert.deepEqual(toolbarMovement(docked, compact), { x: 0, y: -60 })
  // A reversal starts from the position currently visible, not from the old endpoint.
  assert.deepEqual(toolbarMovement({ left: 300, top: 720, width: 200 }, compact), { x: 0, y: -40 })
})
