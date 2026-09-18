import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { sounds } from 'cuelume'
import { NotePlaybackButton } from '../src/components/note-playback-button.tsx'
import {
  ExternalLink,
  actionSoundProps,
  dismissSoundProps,
  disclosureSoundProps,
  interactionSoundProps,
  linkSoundProps,
  toggleSoundProps,
} from '../src/components/links.tsx'

test('sound presets use supported cues and a single native activation event', () => {
  for (const props of [
    linkSoundProps,
    actionSoundProps,
    toggleSoundProps,
    dismissSoundProps,
    disclosureSoundProps(false),
    disclosureSoundProps(true),
  ]) {
    assert.ok(sounds.includes(props['data-cuelume-hover']))
    assert.ok(sounds.includes(props['data-cuelume-toggle']))
    assert.equal(props['data-cuelume-press'], undefined)
    assert.equal(props['data-cuelume-release'], undefined)
  }
  assert.notEqual(
    disclosureSoundProps(false)['data-cuelume-toggle'],
    disclosureSoundProps(true)['data-cuelume-toggle'],
  )
})

test('disabled controls expose no sound attributes for the delegated binder', () => {
  for (const props of [interactionSoundProps('pulse', true), disclosureSoundProps(false, true)]) {
    const html = renderToStaticMarkup(
      createElement('button', { ...props, disabled: true }, 'Submit'),
    )
    assert.doesNotMatch(html, /data-cuelume-/)
  }
  const html = renderToStaticMarkup(
    createElement(NotePlaybackButton, {
      disabled: true,
      isPlaying: false,
      label: 'Play note',
    }),
  )
  assert.doesNotMatch(html, /data-cuelume-/)
})

test('note playback and external navigation expose hover and click feedback', () => {
  for (const element of [
    createElement(NotePlaybackButton, { isPlaying: false, label: 'Play note' }),
    createElement(ExternalLink, { href: 'https://example.com' }, 'Website'),
  ]) {
    const html = renderToStaticMarkup(element)
    assert.match(html, /data-cuelume-hover="tick"/)
    assert.match(html, /data-cuelume-toggle=/)
    assert.doesNotMatch(html, /data-cuelume-(press|release)=/)
  }
})
