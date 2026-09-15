import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FieldFeedback, FormErrorFeedback } from '../src/components/form-feedback.tsx'

test('field feedback animates between hint and error rows', () => {
  const hint = renderToStaticMarkup(
    createElement(FieldFeedback, {
      errorId: 'field-error',
      hint: 'Helpful context',
      hintId: 'field-hint',
    }),
  )
  const error = renderToStaticMarkup(
    createElement(FieldFeedback, {
      error: 'Fix this field',
      errorId: 'field-error',
      hint: 'Helpful context',
      hintId: 'field-hint',
    }),
  )

  assert.match(hint, /grid-rows-\[1fr_0fr\]/)
  assert.match(error, /grid-rows-\[0fr_1fr\]/)
  assert.match(error, /duration-\(--motion-settle\)/)
  assert.match(error, /duration-\(--motion-feedback\)/)
  assert.match(error, /motion-reduce:transition-none/)
  assert.match(error, /Fix this field/)
})

test('general errors keep a stable alert while their row expands', () => {
  const empty = renderToStaticMarkup(createElement(FormErrorFeedback, { message: '' }))
  const error = renderToStaticMarkup(createElement(FormErrorFeedback, { message: 'Try again' }))

  assert.match(empty, /grid-rows-\[0fr\]/)
  assert.match(empty, /role="alert"/)
  assert.match(error, /grid-rows-\[1fr\]/)
  assert.match(error, /Try again/)
})
