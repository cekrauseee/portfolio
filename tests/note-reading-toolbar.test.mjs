import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const styles = readFileSync(
  new URL('../src/components/note-reading.module.css', import.meta.url),
  'utf8',
)

test('minimized toolbar removes hidden controls from the chevron layout', () => {
  assert.match(styles, /\.minimizeControl \{[\s\S]*?display: flex;[\s\S]*?align-items: center;/)
  assert.match(
    styles,
    /\.toolbar\[data-minimized='true'\] \.controls \{[\s\S]*?flex-basis: 0;[\s\S]*?width: 0;[\s\S]*?height: 0;/,
  )
})

test('docked toolbar removes the separator after the back control', () => {
  assert.match(
    styles,
    /\.toolbar\[data-docked='true'\] \.controlRow > \[data-note-toolbar-separator\]:first-of-type \{[\s\S]*?flex-basis: 0;[\s\S]*?opacity: 0;/,
  )
})

test('toolbar controls share the hover background with keyboard focus', () => {
  assert.match(styles, /\.control:hover,\s*\.control:focus-visible \{[\s\S]*?background:/)
})
