import { z } from 'zod'

export const MIN_MEETING_NAME_LENGTH = 2
export const MAX_MEETING_NAME_LENGTH = 120
export const MAX_MEETING_EMAIL_LENGTH = 254

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LOCAL_WHOLE_HOUR_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:00(?::00)?$/

export const MEETING_START_HOUR = 9
export const MEETING_END_HOUR = 18

export const MeetingNameSchema = z
  .string()
  .trim()
  .min(MIN_MEETING_NAME_LENGTH)
  .max(MAX_MEETING_NAME_LENGTH)

export const MeetingEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX_MEETING_EMAIL_LENGTH)
  .regex(EMAIL_PATTERN)

export const MeetingRequestSchema = z.object({
  name: MeetingNameSchema,
  email: MeetingEmailSchema,
  start: z.string().trim().regex(LOCAL_WHOLE_HOUR_PATTERN),
  timeZone: z.string().trim().min(1).refine(isTimeZone),
})

export type MeetingRequest = z.infer<typeof MeetingRequestSchema>

export function isAvailableMeetingDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false
  }

  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay()
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

export function isAvailableMeetingTime(time: string) {
  const match = /^(\d{2}):00(?::00)?$/.exec(time)
  if (!match) {
    return false
  }

  const hour = Number(match[1])
  return hour >= MEETING_START_HOUR && hour < MEETING_END_HOUR
}

export function isAvailableMeetingSlot(start: string) {
  const [date, time] = start.split('T')
  return isAvailableMeetingDate(date) && isAvailableMeetingTime(time)
}

export function isValidMeetingName(value: string) {
  return MeetingNameSchema.safeParse(value).success
}

export function isValidMeetingEmail(value: string) {
  return MeetingEmailSchema.safeParse(value).success
}

function isTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format()
    return true
  } catch {
    return false
  }
}
