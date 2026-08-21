"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import {
  actionClassName,
  ExternalLink,
  focusVisibleClassName,
} from "@/components/links";
import { localeTag, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { retryMessage, shouldUseRetryMessage } from "@/lib/retry-message";

type FieldName = "name" | "email" | "date" | "time";
type Fields = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
export type MeetingPayload = {
  name: string;
  email: string;
  start: string;
  timeZone: string;
};
export type IdempotencyState = {
  fingerprint: string;
  key: string;
};

const initialFields: Fields = { name: "", email: "", date: "", time: "" };
const times = Array.from(
  { length: 24 },
  (_, hour) => `${hour}`.padStart(2, "0") + ":00",
);
const IDEMPOTENCY_STORAGE_KEY = "portfolio:meeting-idempotency";
type IdempotencyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function today() {
  return localDateString(new Date());
}

function responseValue(data: unknown, key: string) {
  return data &&
    typeof data === "object" &&
    key in data &&
    typeof data[key as keyof typeof data] === "string"
    ? data[key as keyof typeof data]
    : undefined;
}

export async function meetingFingerprint(payload: MeetingPayload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  return Array.from(digest, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export function readStoredIdempotency(
  fingerprint: string,
  storage: IdempotencyStorage = sessionStorage,
) {
  try {
    const value: unknown = JSON.parse(
      storage.getItem(IDEMPOTENCY_STORAGE_KEY) ?? "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "fingerprint" in value &&
      value.fingerprint === fingerprint &&
      "key" in value &&
      typeof value.key === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.key,
      )
    ) {
      return value as IdempotencyState;
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  return undefined;
}

export function storeIdempotency(
  value: IdempotencyState,
  storage: IdempotencyStorage = sessionStorage,
) {
  try {
    storage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The in-memory ref still preserves retries for the current page lifecycle.
  }
}

export function removeStoredIdempotency(
  storage: IdempotencyStorage = sessionStorage,
) {
  try {
    storage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export async function resolveMeetingIdempotency(
  payload: MeetingPayload,
  current?: IdempotencyState,
  storage: IdempotencyStorage = sessionStorage,
  createKey: () => string = () => crypto.randomUUID(),
) {
  const fingerprint = await meetingFingerprint(payload);
  if (current?.fingerprint === fingerprint) {
    return current;
  }

  const idempotency = readStoredIdempotency(fingerprint, storage) ?? {
    fingerprint,
    key: createKey(),
  };
  storeIdempotency(idempotency, storage);
  return idempotency;
}

export function MeetingScheduler({
  locale,
  dictionary,
  retry,
}: {
  locale: Locale;
  dictionary: Dictionary["schedule"]["form"];
  retry: Dictionary["retry"];
}) {
  const [fields, setFields] = useState<Fields>(initialFields);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");
  const [meetingLink, setMeetingLink] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [minDate] = useState(today);
  const idempotencyRef = useRef<IdempotencyState | undefined>(undefined);

  function clearIdempotency() {
    idempotencyRef.current = undefined;
    removeStoredIdempotency();
  }

  function updateField(field: FieldName, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError("");
    setSuccess("");
    setMeetingLink(undefined);
  }

  function validate() {
    const nextErrors: Errors = {};
    if (!fields.name.trim()) {
      nextErrors.name = dictionary.enterName;
    }
    if (!fields.email.trim()) {
      nextErrors.email = dictionary.enterEmail;
    } else if (!/^\S+@\S+\.\S+$/.test(fields.email.trim())) {
      nextErrors.email = dictionary.validEmail;
    }
    if (!fields.date) {
      nextErrors.date = dictionary.chooseDate;
    } else if (fields.date < minDate) {
      nextErrors.date = dictionary.futureDate;
    }
    if (!fields.time) {
      nextErrors.time = dictionary.chooseTimeError;
    } else if (new Date(`${fields.date}T${fields.time}:00`) <= new Date()) {
      nextErrors.time = dictionary.futureTime;
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setGeneralError("");
    setSuccess("");
    setMeetingLink(undefined);
    if (Object.keys(nextErrors).length) {
      const first = (Object.keys(initialFields) as FieldName[]).find(
        (field) => nextErrors[field],
      );
      if (first) {
        document.getElementById(`meeting-${first}`)?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload: MeetingPayload = {
        name: fields.name.trim(),
        email: fields.email.trim().toLowerCase(),
        start: `${fields.date}T${fields.time}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const idempotency = await resolveMeetingIdempotency(
        payload,
        idempotencyRef.current,
      );
      idempotencyRef.current = idempotency;

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotency.key,
        },
        body: JSON.stringify(payload),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          clearIdempotency();
          setGeneralError(dictionary.conflict);
        } else if (shouldUseRetryMessage(response)) {
          setGeneralError(retryMessage(response, retry));
        } else {
          setGeneralError(dictionary.unableToSchedule);
        }
        return;
      }

      clearIdempotency();
      setSuccess(dictionary.success);
      setMeetingLink(
        responseValue(data, "meetLink") ?? responseValue(data, "calendarLink"),
      );
    } catch {
      setGeneralError(dictionary.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  const field = (
    name: FieldName,
    label: string,
    control: React.ReactNode,
    hint?: string,
  ) => (
    <div className="flex flex-col gap-2">
      <label className="font-medium" htmlFor={`meeting-${name}`}>
        {label}
      </label>
      {control}
      {hint ? (
        <p
          className="text-black/60 dark:text-white/65"
          id={`meeting-${name}-hint`}
        >
          {hint}
        </p>
      ) : null}
      {errors[name] ? (
        <p
          className="text-black/70 dark:text-white/75"
          id={`meeting-${name}-error`}
        >
          {errors[name]}
        </p>
      ) : null}
    </div>
  );

  const inputClass = `w-full border border-black/20 bg-transparent px-3 py-3 text-base leading-6 outline-none placeholder:text-black/45 focus:border-black dark:border-white/25 dark:placeholder:text-white/45 dark:focus:border-white ${focusVisibleClassName}`;
  return (
    <div lang={localeTag(locale)}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {field(
          "name",
          dictionary.name,
          <input
            autoComplete="name"
            className={inputClass}
            id="meeting-name"
            name="name"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder={dictionary.namePlaceholder}
            value={fields.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "meeting-name-error" : undefined}
          />,
        )}
        {field(
          "email",
          dictionary.email,
          <input
            autoComplete="email"
            className={inputClass}
            id="meeting-email"
            name="email"
            type="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder={dictionary.emailPlaceholder}
            value={fields.email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "meeting-email-error" : undefined}
          />,
        )}
        {field(
          "date",
          dictionary.date,
          <input
            className={`${inputClass} cursor-pointer`}
            id="meeting-date"
            min={minDate}
            name="date"
            type="date"
            onChange={(event) => updateField("date", event.target.value)}
            value={fields.date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={
              errors.date ? "meeting-date-error" : "meeting-date-hint"
            }
          />,
          dictionary.dateHint,
        )}
        {field(
          "time",
          dictionary.time,
          <div className="relative">
            <select
              className={`${inputClass} cursor-pointer appearance-none pr-10`}
              id="meeting-time"
              name="time"
              onChange={(event) => updateField("time", event.target.value)}
              value={fields.time}
              aria-invalid={Boolean(errors.time)}
              aria-describedby={
                errors.time ? "meeting-time-error" : "meeting-time-hint"
              }
            >
              <option value="">{dictionary.chooseTime}</option>
              {times.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                d="m4 6 4 4 4-4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </div>,
          dictionary.timeHint,
        )}
        {generalError ? (
          <p className="text-black/70 dark:text-white/75" role="alert">
            {generalError}
          </p>
        ) : null}
        <button
          className={`${actionClassName} disabled:cursor-not-allowed disabled:bg-black/45 dark:disabled:bg-white/45`}
          disabled={submitting}
          type="submit"
        >
          {submitting ? dictionary.booking : dictionary.book}
        </button>
      </form>
      <p aria-live="polite" className="sr-only" role="status">
        {submitting ? dictionary.bookingStatus : success}
      </p>
      {success ? (
        <p className="mt-6 text-black/75 dark:text-white/85">
          {success}
          {meetingLink ? (
            <>
              {" "}
              <ExternalLink
                href={meetingLink}
                newTabLabel={dictionary.externalLinkNewTab}
              >
                {dictionary.meetingDetails}
              </ExternalLink>
              .
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
