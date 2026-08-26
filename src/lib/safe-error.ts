export type SafeErrorDetails = {
  kind: string;
  code?: string;
  status?: number;
  request_id?: string;
  cause_kind?: string;
  cause_code?: string;
};

type ErrorRecord = Record<string, unknown> & {
  cause?: unknown;
  response?: { status?: unknown };
};

export function safeErrorDetails(error: unknown): SafeErrorDetails {
  const value = isRecord(error) ? (error as ErrorRecord) : undefined;
  const cause = value && isRecord(value.cause) ? value.cause : undefined;

  return compact({
    kind: errorKind(error),
    code: safeIdentifier(value?.code),
    status: safeStatus(
      value?.status ?? value?.statusCode ?? value?.response?.status,
    ),
    request_id: safeIdentifier(value?.requestID ?? value?.request_id),
    cause_kind:
      value?.cause instanceof Error ? errorKind(value.cause) : undefined,
    cause_code: safeIdentifier(cause?.code),
  });
}

function errorKind(error: unknown) {
  if (!(error instanceof Error)) {
    return "UnknownError";
  }
  const name = error.name.trim();
  const constructorName = error.constructor.name.trim();
  return name && name !== "Error" ? name : constructorName || name || "Error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function safeIdentifier(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return /^[A-Za-z0-9._:/-]{1,128}$/.test(normalized) ? normalized : undefined;
}

function safeStatus(value: unknown) {
  const status = typeof value === "number" ? value : Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : undefined;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
