import assert from 'node:assert/strict'
import test from 'node:test'
import { focusVisibleClassName, linkFocusClassName } from '../src/components/links.tsx'
import { preferenceOptionClassName } from '../src/components/preference-option.ts'

test('links and quiet actions avoid the generic focus outline', () => {
  assert.match(linkFocusClassName, /focus-visible:outline-none/)
  assert.doesNotMatch(linkFocusClassName, /focus-visible:outline-2/)
})

test('ghost preference controls keep the focus outline and hover background', () => {
  assert.match(focusVisibleClassName, /focus-visible:outline/)
  assert.match(preferenceOptionClassName, /focus-visible:bg-black/)
})
