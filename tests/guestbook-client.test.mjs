import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appendUniqueMessages,
  prependUniqueMessage,
  resolveGuestbookSubmission,
} from '../src/features/guestbook/guestbook-client-state.ts'

const older = {
  id: 'older',
  name: 'ana',
  message: 'older',
  createdAt: '2026-09-10T08:00:00.000Z',
}
const newer = {
  id: 'newer',
  name: 'bia',
  message: 'newer',
  createdAt: '2026-09-10T09:00:00.000Z',
}

test('guestbook message merges keep local prepends and avoid duplicates', () => {
  assert.deepEqual(appendUniqueMessages([newer], [newer, older]), [newer, older])
  assert.deepEqual(prependUniqueMessage([older, newer], newer), [newer, older])
})

test('guestbook submission id is reused only for the same payload', () => {
  let sequence = 0
  const createId = () => `id-${++sequence}`
  const first = resolveGuestbookSubmission('ana', 'hello', undefined, createId)
  const retry = resolveGuestbookSubmission('ana', 'hello', first, createId)
  const changed = resolveGuestbookSubmission('ana', 'hello again', retry, createId)

  assert.equal(retry, first)
  assert.equal(retry.id, 'id-1')
  assert.equal(changed.id, 'id-2')
})

test('a delayed first page keeps concurrent posts in newest-first order', () => {
  const latest = {
    ...newer,
    id: 'latest',
    createdAt: '2026-09-10T10:00:00.000Z',
  }
  assert.deepEqual(appendUniqueMessages([newer], [latest, newer, older]), [latest, newer, older])
  assert.deepEqual(prependUniqueMessage([latest, newer], older), [latest, newer, older])
  const tied = { ...newer, id: 'z' }
  assert.deepEqual(appendUniqueMessages([newer], [tied, tied]), [tied, newer])
})
