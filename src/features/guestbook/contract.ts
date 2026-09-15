import { z } from 'zod'

export const GUESTBOOK_PAGE_SIZE = 5
export const MAX_GUESTBOOK_NAME_LENGTH = 80
export const MAX_GUESTBOOK_MESSAGE_LENGTH = 500
export const GuestbookSubmissionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(MAX_GUESTBOOK_NAME_LENGTH)
      .regex(/^[^\r\n\u0000]*$/),
    message: z
      .string()
      .trim()
      .min(1)
      .max(MAX_GUESTBOOK_MESSAGE_LENGTH)
      .refine((value) => !value.includes('\u0000')),
    submissionId: z.uuid(),
  })
  .strict()
export type GuestbookSubmission = z.infer<typeof GuestbookSubmissionSchema>
export const GuestbookMessageSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  message: z.string(),
  createdAt: z.iso.datetime({ precision: 3 }),
})
export type GuestbookMessage = z.infer<typeof GuestbookMessageSchema>
export type GuestbookPage = {
  messages: GuestbookMessage[]
  nextCursor: string | null
}
export type GuestbookErrorCode =
  | 'invalid_message'
  | 'message_rejected'
  | 'rate_limited'
  | 'request_denied'
  | 'service_unavailable'
  | 'submission_conflict'

export const GuestbookPageResponseSchema = z.object({
  messages: z.array(GuestbookMessageSchema),
  nextCursor: z.string().nullable(),
  rememberedName: z.string(),
})
export const GuestbookPublishResponseSchema = z.object({
  message: GuestbookMessageSchema,
})
export const GuestbookErrorPayloadSchema = z.object({
  error: z.object({
    code: z.enum([
      'invalid_message',
      'message_rejected',
      'rate_limited',
      'request_denied',
      'service_unavailable',
      'submission_conflict',
    ]),
    operationId: z.string().optional(),
  }),
})

const CursorSchema = z
  .object({ createdAt: z.iso.datetime({ precision: 3 }), id: z.uuid() })
  .strict()
export type GuestbookCursor = z.infer<typeof CursorSchema>
export function encodeGuestbookCursor(message: GuestbookMessage) {
  return Buffer.from(JSON.stringify({ createdAt: message.createdAt, id: message.id })).toString(
    'base64url',
  )
}
export function decodeGuestbookCursor(value: string): GuestbookCursor | null {
  if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return null
  }
  try {
    const parsed = CursorSchema.safeParse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
