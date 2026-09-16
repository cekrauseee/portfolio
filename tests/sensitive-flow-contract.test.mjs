import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fitErrorMessage, parseFitErrorCode } from '../src/features/role-fit/errors.ts'
import {
  meetingErrorMessage,
  parseMeetingErrorCode,
} from '../src/features/meeting-scheduling/errors.ts'
import {
  MeetingInputError,
  validateMeetingRequest,
} from '../src/features/meeting-scheduling/schedule-meeting.ts'
import {
  isAvailableMeetingDate,
  isAvailableMeetingSlot,
  isAvailableMeetingTime,
  isValidMeetingEmail,
  isValidMeetingName,
  MAX_MEETING_EMAIL_LENGTH,
  MAX_MEETING_NAME_LENGTH,
} from '../src/features/meeting-scheduling/validation.ts'
import { en } from '../src/i18n/dictionaries/en.ts'

test('fit and meeting retries use semantic non-numeric guidance', () => {
  const fitCode = parseFitErrorCode({
    error: { code: 'rate_limited', operationId: 'fit-operation' },
  })
  const meetingCode = parseMeetingErrorCode({
    error: { code: 'rate_limited', operationId: 'meeting-operation' },
  })

  assert.equal(fitCode, 'rate_limited')
  assert.equal(meetingCode, 'rate_limited')
  assert.equal(fitErrorMessage(fitCode, en.fit.form), en.fit.form.rateLimited)
  assert.equal(meetingErrorMessage(meetingCode, en.schedule.form), en.schedule.form.rateLimited)
  assert.doesNotMatch(en.fit.form.rateLimited, /\d/)
  assert.doesNotMatch(en.schedule.form.rateLimited, /\d/)
})

test('fit guardrail rejection has localized field guidance', () => {
  const code = parseFitErrorCode({
    error: { code: 'description_rejected', operationId: 'fit-operation' },
  })
  assert.equal(code, 'description_rejected')
  assert.match(en.fit.form.descriptionRejected, /job or project description/)
})

test('meeting client and server share exact identity validation', () => {
  assert.equal(isValidMeetingName('A'), false)
  assert.equal(isValidMeetingName('Ada'), true)
  assert.equal(isValidMeetingName('a'.repeat(MAX_MEETING_NAME_LENGTH + 1)), false)
  assert.equal(isValidMeetingEmail('ada@example.com'), true)
  assert.equal(isValidMeetingEmail('invalid'), false)
  assert.equal(isValidMeetingEmail(`${'a'.repeat(MAX_MEETING_EMAIL_LENGTH)}@example.com`), false)
})

test('meeting availability is limited to weekdays and one-hour slots ending by 18:00', () => {
  assert.equal(isAvailableMeetingDate('2026-09-21'), true)
  assert.equal(isAvailableMeetingDate('2026-09-20'), false)
  assert.equal(isAvailableMeetingTime('09:00'), true)
  assert.equal(isAvailableMeetingTime('09:00:00'), true)
  assert.equal(isAvailableMeetingTime('17:00'), true)
  assert.equal(isAvailableMeetingTime('18:00'), false)
  assert.equal(isAvailableMeetingSlot('2026-09-25T17:00'), true)
  assert.equal(isAvailableMeetingSlot('2026-09-25T17:00:00'), true)
  assert.equal(isAvailableMeetingSlot('2026-09-25T18:00'), false)
  assert.equal(isAvailableMeetingSlot('2026-09-26T10:00'), false)
})

test('the meeting endpoint rejects unavailable days and times', () => {
  const accepted = validateMeetingRequest({
    name: 'Ada',
    email: 'ada@example.com',
    start: '2099-09-21T10:00:00',
    timeZone: 'UTC',
  })
  assert.equal(accepted.start, '2099-09-21T10:00:00')

  assert.throws(
    () =>
      validateMeetingRequest({
        name: 'Ada',
        email: 'ada@example.com',
        start: '2099-09-20T10:00',
        timeZone: 'UTC',
      }),
    MeetingInputError,
  )
  assert.throws(
    () =>
      validateMeetingRequest({
        name: 'Ada',
        email: 'ada@example.com',
        start: '2099-09-21T18:00',
        timeZone: 'UTC',
      }),
    MeetingInputError,
  )
})

test('sensitive operations no longer emit fragmented feature logs', () => {
  const sources = [
    '../src/app/api/fit/route.ts',
    '../src/app/api/meetings/route.ts',
    '../src/features/meeting-scheduling/schedule-meeting.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  for (const source of sources) {
    assert.doesNotMatch(source, /console\.(?:error|info|warn)/)
  }
})
