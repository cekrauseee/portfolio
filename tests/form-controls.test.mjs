import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Input } from '../src/components/input.tsx'
import { Textarea } from '../src/components/textarea.tsx'

for (const [name, component] of [
  ['input', Input],
  ['textarea', Textarea],
]) {
  test(`${name} provides typing feedback without replacing native field semantics`, () => {
    const html = renderToStaticMarkup(
      createElement(component, {
        id: 'description',
        name: 'description',
        defaultValue: 'Existing draft',
        className: 'existing-field-style',
        maxLength: 16000,
        'aria-invalid': true,
        'aria-describedby': 'description-error',
        disabled: true,
        readOnly: true,
      }),
    )
    assert.match(html, new RegExp(`<${name}\\b`))
    assert.equal((html.match(/data-typing-sound=/g) ?? []).length, 1)
    assert.match(html, /Existing draft/)
    assert.match(html, /name="description"/)
    assert.match(html, /class="existing-field-style"/)
    assert.match(html, /maxLength="16000"/)
    assert.match(html, /aria-invalid="true"/)
    assert.match(html, /aria-describedby="description-error"/)
    assert.match(html, /disabled=""/)
    assert.match(html, /readOnly=""/)
  })
}

test('Input preserves email and date input types', () => {
  for (const type of ['email', 'date']) {
    const html = renderToStaticMarkup(
      createElement(Input, { type, min: type === 'date' ? '2026-09-18' : undefined }),
    )
    assert.match(html, new RegExp(`type="${type}"`))
    if (type === 'date') assert.match(html, /min="2026-09-18"/)
  }
})
