"use client";

import type { SubmitEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  actionClassName,
  actionSoundProps,
  focusVisibleClassName,
} from "@/components/links";
import { resolveDeviceLocation } from "@/features/guestbook/device-location";
import {
  guestbookErrorMessage,
  parseGuestbookErrorCode,
} from "@/features/guestbook/errors";
import { localeTag, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import {
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  type SubmittedGeoCoordinates,
} from "@/features/guestbook/message";
import { playInteractionSound } from "@/lib/interaction-sounds";

type FieldName = "name" | "message";
type Fields = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

type MessageFormDictionary = Dictionary["guestbook"]["form"];

const initialFields: Fields = { name: "", message: "" };

export function MessageForm({
  locale,
  dictionary,
  onSubmitted,
}: {
  locale: Locale;
  dictionary: MessageFormDictionary;
  onSubmitted?: () => void;
}) {
  const [fields, setFields] = useState<Fields>(initialFields);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const deviceLocationRef = useRef<SubmittedGeoCoordinates | null>(null);
  const locationRequestRef = useRef<
    Promise<SubmittedGeoCoordinates | null> | undefined
  >(undefined);
  const initialLocationCheckStartedRef = useRef(false);

  const resolvePreferredLocation = useCallback(() => {
    if (deviceLocationRef.current) {
      return Promise.resolve(deviceLocationRef.current);
    }
    if (locationRequestRef.current) {
      return locationRequestRef.current;
    }

    const request: Promise<SubmittedGeoCoordinates | null> =
      resolveDeviceLocation("granted-only").then((result) => {
        const location = result.status === "available" ? result.location : null;
        if (location) {
          deviceLocationRef.current = location;
        }
        if (locationRequestRef.current === request) {
          locationRequestRef.current = undefined;
        }
        return location;
      });
    locationRequestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (initialLocationCheckStartedRef.current) {
      return;
    }
    initialLocationCheckStartedRef.current = true;
    void resolvePreferredLocation();
  }, [resolvePreferredLocation]);

  function updateField(field: FieldName, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError("");
    setSuccess("");
  }

  function validate() {
    const nextErrors: Errors = {};
    if (!fields.name.trim()) {
      nextErrors.name = dictionary.enterName;
    } else if (fields.name.trim().length > MAX_NAME_LENGTH) {
      nextErrors.name = dictionary.nameTooLong.replace(
        "{max}",
        String(MAX_NAME_LENGTH),
      );
    }
    if (!fields.message.trim()) {
      nextErrors.message = dictionary.writeMessage;
    } else if (fields.message.trim().length > MAX_MESSAGE_LENGTH) {
      nextErrors.message = dictionary.messageTooLong.replace(
        "{max}",
        String(MAX_MESSAGE_LENGTH),
      );
    }
    return nextErrors;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setGeneralError("");
    setSuccess("");
    if (Object.keys(nextErrors).length) {
      playInteractionSound("error");
      const first = (Object.keys(initialFields) as FieldName[]).find(
        (field) => nextErrors[field],
      );
      if (first) {
        document.getElementById(`globe-${first}`)?.focus();
      }
      return;
    }

    setSubmitting(true);
    playInteractionSound("loading");
    try {
      const location = await resolvePreferredLocation();
      const response = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          message: fields.message.trim(),
          ...(location ? { location } : {}),
        }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => undefined);
        setGeneralError(
          guestbookErrorMessage(parseGuestbookErrorCode(payload), dictionary),
        );
        playInteractionSound("error");
        return;
      }
      setSuccess(dictionary.success);
      setFields(initialFields);
      playInteractionSound("success");
      onSubmitted?.();
    } catch {
      setGeneralError(dictionary.connectionError);
      playInteractionSound("error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (name: FieldName) =>
    `w-full border bg-transparent px-3 py-3 text-base leading-6 text-foreground outline-none placeholder:text-black/45 dark:placeholder:text-white/45 ${focusVisibleClassName} ${
      errors[name]
        ? "border-red-700 focus:border-red-700 dark:border-red-400 dark:focus:border-red-400"
        : "border-black/20 focus:border-black dark:border-white/25 dark:focus:border-white"
    }`;

  const field = (name: FieldName, label: string, control: React.ReactNode) => {
    const hasError = Boolean(errors[name]);
    return (
      <div className="flex flex-col gap-2">
        <label
          className={`font-medium ${hasError ? "text-red-700 dark:text-red-400" : ""}`}
          htmlFor={`globe-${name}`}
        >
          {label}
        </label>
        {control}
        {errors[name] ? (
          <p
            className="text-red-700 dark:text-red-400"
            id={`globe-${name}-error`}
          >
            {errors[name]}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div lang={localeTag(locale)}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {field(
          "name",
          dictionary.name,
          <input
            autoComplete="name"
            className={inputClass("name")}
            id="globe-name"
            maxLength={MAX_NAME_LENGTH}
            name="name"
            onChange={(e) => updateField("name", e.target.value)}
            value={fields.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "globe-name-error" : undefined}
            placeholder={dictionary.namePlaceholder}
          />,
        )}
        {field(
          "message",
          dictionary.message,
          <textarea
            className={`${inputClass("message")} resize-none`}
            id="globe-message"
            maxLength={MAX_MESSAGE_LENGTH}
            name="message"
            onChange={(e) => updateField("message", e.target.value)}
            value={fields.message}
            rows={3}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={
              errors.message ? "globe-message-error" : undefined
            }
            placeholder={dictionary.messagePlaceholder}
          />,
        )}
        {generalError ? (
          <p className="text-red-700 dark:text-red-400" role="alert">
            {generalError}
          </p>
        ) : null}
        <button
          {...actionSoundProps}
          className={`${actionClassName} transition-transform active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-black/45 dark:disabled:bg-white/45`}
          disabled={submitting}
          type="submit"
        >
          {submitting ? dictionary.publishing : dictionary.publish}
        </button>
      </form>
      <p aria-live="polite" className="sr-only" role="status">
        {submitting ? dictionary.publishingStatus : success}
      </p>
      {success ? (
        <p className="mt-6 text-black/75 dark:text-white/85">{success}</p>
      ) : null}
    </div>
  );
}
