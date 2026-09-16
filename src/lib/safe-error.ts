export type SafeErrorDetails = {
  kind: string
  code?: string
  status?: number
  provider_code?: string
  summary?: string
  upstream_endpoint?: string
  request_id?: string
  cause_kind?: string
  cause_code?: string
}

type ErrorRecord = Record<string, unknown> & {
  cause?: unknown
  config?: { url?: unknown }
  response?: { status?: unknown; data?: unknown; config?: { url?: unknown } }
}

export function safeErrorDetails(error: unknown): SafeErrorDetails {
  const value = isRecord(error) ? (error as ErrorRecord) : undefined
  const cause = value && isRecord(value.cause) ? value.cause : undefined
  const causeValue = cause as ErrorRecord | undefined
  const status = safeStatus(
    value?.status ?? value?.statusCode ?? value?.response?.status ?? causeValue?.response?.status,
  )
  const providerCode = responseErrorCode(value?.response?.data ?? causeValue?.response?.data)
  const upstreamEndpoint = upstreamEndpointName(
    value?.response?.config?.url ??
      value?.config?.url ??
      causeValue?.response?.config?.url ??
      causeValue?.config?.url,
  )

  return compact({
    kind: errorKind(error),
    code: safeIdentifier(value?.code),
    status,
    provider_code: providerCode,
    summary: humanSummary(status, providerCode, upstreamEndpoint),
    upstream_endpoint: upstreamEndpoint,
    request_id: safeIdentifier(value?.requestID ?? value?.request_id),
    cause_kind: value?.cause instanceof Error ? errorKind(value.cause) : undefined,
    cause_code: safeIdentifier(cause?.code),
  })
}

function errorKind(error: unknown) {
  if (!(error instanceof Error)) {
    return 'UnknownError'
  }
  const name = error.name.trim()
  const constructorName = error.constructor.name.trim()
  return name && name !== 'Error' ? name : constructorName || name || 'Error'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function safeIdentifier(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim()
  return /^[A-Za-z0-9._:/-]{1,128}$/.test(normalized) ? normalized : undefined
}

function safeStatus(value: unknown) {
  const status = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined
}

function responseErrorCode(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }
  return safeIdentifier(value.error)
}

function upstreamEndpointName(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }
  try {
    const url = new URL(value)
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/token') {
      return 'google_oauth_token'
    }
    if (url.origin === 'https://www.googleapis.com' && url.pathname.includes('/calendar/')) {
      if (url.pathname.endsWith('/freeBusy')) {
        return 'google_calendar_freebusy'
      }
      if (url.pathname.includes('/events')) {
        return 'google_calendar_events'
      }
      return 'google_calendar_api'
    }
    if (url.origin === 'https://api.resend.com' && url.pathname === '/emails') {
      return 'resend_emails'
    }
  } catch {
    // Do not include malformed or unrecognized URLs in logs.
  }
  return undefined
}

function humanSummary(
  status: number | undefined,
  providerCode: string | undefined,
  upstreamEndpoint: string | undefined,
) {
  const endpoint = upstreamEndpoint ?? 'upstream service'
  if (providerCode) {
    return `${endpoint} returned provider code ${providerCode}.`
  }
  if (status === 400) {
    return `${endpoint} returned HTTP 400.`
  }
  if (status === 401 || status === 403) {
    return `${endpoint} rejected authentication or permissions with HTTP ${status}.`
  }
  if (status !== undefined && status >= 500) {
    return `${endpoint} failed with HTTP ${status}.`
  }
  return 'The operation failed unexpectedly.'
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}
