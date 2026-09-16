import assert from 'node:assert/strict'
import test from 'node:test'

import { safeErrorDetails } from '../src/lib/safe-error.ts'

test('safe error details identify a rejected Google OAuth refresh token', () => {
  const error = new Error('upstream request failed')
  error.name = 'n'
  error.response = {
    status: 400,
    config: { url: 'https://oauth2.googleapis.com/token' },
    data: {
      error: 'invalid_grant',
      error_description: 'The refresh token has been revoked.',
    },
  }

  assert.deepEqual(safeErrorDetails(error), {
    kind: 'n',
    status: 400,
    provider_code: 'invalid_grant',
    summary: 'google_oauth_token returned provider code invalid_grant.',
    upstream_endpoint: 'google_oauth_token',
  })
})

test('safe error details provide a generic summary for an upstream 400', () => {
  const error = new Error('upstream request failed')
  error.response = { status: 400, data: { error: 'bad_request' } }

  assert.equal(
    safeErrorDetails(error).summary,
    'upstream service returned provider code bad_request.',
  )
  assert.equal(safeErrorDetails(error).provider_code, 'bad_request')
})
