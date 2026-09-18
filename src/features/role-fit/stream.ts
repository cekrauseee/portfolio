import { z } from 'zod'
import { FitErrorPayloadSchema, type FitErrorCode } from './errors'

export const FitStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), delta: z.string() }),
  z.object({ type: z.literal('done') }),
  FitErrorPayloadSchema.extend({ type: z.literal('error') }),
])
export type FitStreamEvent = z.infer<typeof FitStreamEventSchema>

export function encodeFitStreamEvent(event: FitStreamEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`)
}

export class FitStreamError extends Error {
  constructor(public code: FitErrorCode = 'assessment_failed') {
    super('The assessment stream did not complete.')
  }
}

/** Frames may straddle network chunks, including within a UTF-8 character. */
export async function* readFitStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let boundary: number
      while ((boundary = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 1)
        if (!line.trim()) continue
        const event = FitStreamEventSchema.parse(JSON.parse(line))
        if (event.type === 'error') throw new FitStreamError(event.error.code)
        if (event.type === 'done') return
        yield event.delta
      }
      if (done) throw new FitStreamError()
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
