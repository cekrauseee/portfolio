import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import OpenAI from 'openai'
import { createGuestbookGet, createGuestbookPost } from '../src/features/guestbook/handler.ts'
import {
  GuestbookSubmissionSchema,
  encodeGuestbookCursor,
  decodeGuestbookCursor,
} from '../src/features/guestbook/contract.ts'
import {
  rememberedGuestbookName,
  rememberGuestbookName,
} from '../src/features/guestbook/name-cookie.ts'
import { guardGuestbookMessage } from '../src/features/guestbook/guard-message.ts'
import { GUARDRAIL_DECISION_TEXT_CONFIG } from '../src/lib/guardrail-decision.ts'
import { readJson } from '../src/lib/abuse-protection.ts'

const submission = {
  name: 'Ana Silva',
  message: 'Gostei muito!',
  submissionId: randomUUID(),
}
function request(input = submission, headers = {}) {
  return new Request('https://portfolio.test/api/guestbook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://portfolio.test',
      ...headers,
    },
    body: JSON.stringify(input),
  })
}
function setup(overrides = {}) {
  const rows = new Map()
  const events = []
  let guarded = 0
  let released = 0
  const dependencies = {
    protect: async () => ({ identity: 'identity', sessionCookie: 'session' }),
    acquire: async () => 'owner',
    release: async () => {
      released++
    },
    digest: (value) => value,
    guardGuestbookMessage: async () => {
      guarded++
      return { status: 'approved' }
    },
    findGuestbookSubmission: async (key) => rows.get(key) ?? null,
    insertGuestbookMessage: async (input, key) => {
      if (!rows.has(key))
        rows.set(key, {
          id: randomUUID(),
          name: input.name,
          message: input.message,
          createdAt: new Date(),
          hiddenAt: null,
          submissionKey: key,
        })
      return rows.get(key)
    },
    logOperation: (event) => events.push(event),
    ...overrides,
  }
  return {
    post: createGuestbookPost(dependencies),
    rows,
    events,
    guarded: () => guarded,
    released: () => released,
  }
}

test('publication remembers the name, exposes only public fields, and replays a lost response once', async () => {
  const state = setup()
  const first = await state.post(request())
  assert.equal(first.status, 201)
  const body = await first.json()
  assert.deepEqual(Object.keys(body.message).sort(), ['createdAt', 'id', 'message', 'name'])
  assert.match(first.headers.get('set-cookie'), /guestbook_name=Ana%20Silva/)
  assert.match(first.headers.get('set-cookie'), /anon_session=/)
  assert.equal(first.headers.get('cache-control'), 'private, no-store')
  const retry = await state.post(request())
  assert.equal(retry.status, 200)
  assert.deepEqual(await retry.json(), body)
  assert.equal(state.rows.size, 1)
  assert.equal(state.guarded(), 1)
  assert.equal(state.released(), 1)
  assert.doesNotMatch(JSON.stringify(state.events), /Ana Silva|Gostei muito|submissionId/)
})

test('retry keys cannot change content or republish a hidden message', async () => {
  const state = setup()
  await state.post(request())
  const conflict = await state.post(request({ ...submission, message: 'Other' }))
  assert.equal(conflict.status, 409)
  assert.equal((await conflict.json()).error.code, 'submission_conflict')
  state.rows.values().next().value.hiddenAt = new Date()
  assert.equal((await state.post(request())).status, 422)
})

test('cross-site, invalid and oversized requests cannot reach OpenAI or the database', async () => {
  const state = setup()
  assert.equal((await state.post(request(submission, { origin: 'https://evil.test' }))).status, 403)
  assert.equal((await state.post(request({ ...submission, name: ' ' }))).status, 400)
  assert.equal((await state.post(request({ ...submission, message: 'x'.repeat(501) }))).status, 400)
  assert.equal(
    (await readJson(request({ ...submission, message: 'x'.repeat(9000) }), 'guestbook')).response
      .status,
    413,
  )
  assert.equal(state.guarded(), 0)
  assert.equal(state.rows.size, 0)
})

test('guardrail refusal or failure never publishes; locks release on every outcome', async () => {
  for (const [status, expected] of [
    ['rejected', 422],
    ['failed', 503],
  ]) {
    const state = setup({ guardGuestbookMessage: async () => ({ status }) })
    const result = await state.post(request())
    assert.equal(result.status, expected)
    assert.equal(state.rows.size, 0)
    assert.equal(state.released(), 1)
  }
  const failedWrite = setup({
    insertGuestbookMessage: async () => {
      throw new Error('private SQL details')
    },
  })
  assert.equal((await failedWrite.post(request())).status, 503)
  assert.equal(failedWrite.released(), 1)
  assert.doesNotMatch(JSON.stringify(failedWrite.events), /private SQL details/)
  const failedRelease = setup({
    release: async () => {
      throw new Error('redis down')
    },
  })
  assert.equal((await failedRelease.post(request())).status, 201)
  assert.ok(failedRelease.events[0].lock_release_error)
})

test('denial and concurrency preserve semantic errors and never invoke the guardrail', async () => {
  const denied = setup({
    protect: async () =>
      new Response(null, {
        status: 429,
        headers: { 'Retry-After': '20', 'Set-Cookie': 'anon_session=issued' },
      }),
  })
  const response = await denied.post(request())
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '20')
  assert.match(response.headers.get('set-cookie'), /anon_session=issued/)
  assert.equal(denied.guarded(), 0)
  const locked = setup({ acquire: async () => false })
  assert.equal((await locked.post(request())).status, 429)
  assert.equal(locked.guarded(), 0)
})

test('cursors preserve timestamp and UUID and reject malformed input before a query', async () => {
  const reference = { id: randomUUID(), createdAt: '2026-09-10T10:00:00.123Z' }
  assert.deepEqual(decodeGuestbookCursor(encodeGuestbookCursor(reference)), reference)
  for (const value of ['', '%', 'x'.repeat(257), Buffer.from('{"id":"bad"}').toString('base64url')])
    assert.equal(decodeGuestbookCursor(value), null)
  let queried = 0
  const get = createGuestbookGet({
    listGuestbookMessages: async () => {
      queried++
      return { messages: [], nextCursor: null }
    },
    logOperation: () => {},
  })
  assert.equal(
    (await get(new Request('https://portfolio.test/api/guestbook?cursor=bad'))).status,
    400,
  )
  assert.equal(queried, 0)
  const result = await get(
    new Request('https://portfolio.test/api/guestbook', {
      headers: { cookie: 'guestbook_name=Ana%20Silva' },
    }),
  )
  assert.equal((await result.json()).rememberedName, 'Ana Silva')
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
})

test('name cookies handle Unicode and malformed values without tracking identity', () => {
  const response = rememberGuestbookName(new Response(), 'あな; Ana')
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/)
  for (const [cookie, name] of [
    ['guestbook_name=%E3%81%82%E3%81%AA', 'あな'],
    ['guestbook_name=%ZZ', ''],
    ['guestbook_name=%0Ahello', 'hello'],
    [`guestbook_name=${'a'.repeat(81)}`, ''],
  ]) {
    assert.equal(
      rememberedGuestbookName(new Request('https://portfolio.test', { headers: { cookie } })),
      name,
    )
  }
  assert.equal(
    GuestbookSubmissionSchema.safeParse({ ...submission, name: 'Ana\nSilva' }).success,
    false,
  )
})

test('OpenAI guardrail uses parsed schema, short prompt and closed failure handling', async () => {
  const previous = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'test-only-not-a-real-key'
  try {
    let observed
    for (const approved of [true, false]) {
      const result = await guardGuestbookMessage(submission, 'hashed-identity', {
        openai: {
          responses: {
            parse: async (input) => {
              observed = input
              return { status: 'completed', output_parsed: { approved } }
            },
          },
        },
      })
      assert.equal(result.status, approved ? 'approved' : 'rejected')
    }
    assert.equal(observed.text, GUARDRAIL_DECISION_TEXT_CONFIG)
    assert.equal(observed.store, false)
    assert.ok(observed.instructions.length < 700)
    assert.deepEqual(JSON.parse(observed.input), {
      name: submission.name,
      message: submission.message,
    })
    for (const response of [
      { status: 'completed', output_parsed: null },
      { status: 'incomplete', output_parsed: { approved: true } },
    ]) {
      assert.equal(
        (
          await guardGuestbookMessage(submission, 'identity', {
            openai: { responses: { parse: async () => response } },
          })
        ).status,
        'failed',
      )
    }
    const timeout = await guardGuestbookMessage(submission, 'identity', {
      openai: {
        responses: {
          parse: async () => {
            throw new OpenAI.APIConnectionTimeoutError()
          },
        },
      },
    })
    assert.equal(timeout.failure.reason, 'timeout')
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previous
  }
})
