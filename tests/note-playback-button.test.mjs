import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as Tooltip from '@radix-ui/react-tooltip'
import { NotePlaybackButton } from '../src/components/note-playback-button.tsx'

test('playback button forwards the ref and trigger events supplied by Radix', () => {
  const ref = () => {}
  const onPointerMove = () => {}
  const button = NotePlaybackButton({
    label: 'ouvir',
    isPlaying: false,
    ref,
    onPointerMove,
    'aria-describedby': 'tooltip-content',
    'data-state': 'delayed-open',
  })
  assert.equal(button.type, 'button')
  assert.equal(button.props.ref, ref)
  assert.equal(button.props.onPointerMove, onPointerMove)
  assert.equal(button.props['aria-describedby'], 'tooltip-content')
  assert.equal(button.props['data-state'], 'delayed-open')
  assert.equal(button.props['aria-label'], 'ouvir')
})

test('Radix asChild produces one accessible playback button', () => {
  const html = renderToStaticMarkup(
    createElement(
      Tooltip.Provider,
      null,
      createElement(
        Tooltip.Root,
        { open: true },
        createElement(
          Tooltip.Trigger,
          { asChild: true },
          createElement(NotePlaybackButton, { label: 'pausar', isPlaying: true }),
        ),
      ),
    ),
  )
  assert.equal([...html.matchAll(/<button\b/g)].length, 1)
  assert.match(html, /aria-label="pausar"/)
  assert.match(html, /aria-describedby="[^"]+"/)
  assert.match(html, /data-state="instant-open"/)
  assert.doesNotMatch(html, / title=/)
})
