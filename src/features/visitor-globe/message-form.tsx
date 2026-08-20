"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { retryMessage } from "@/lib/retry-message";
import { actionClassName } from "@/components/links";
import {
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
} from "@/features/visitor-globe/moderate-message";

type FieldName = "name" | "message";
type Fields = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const initialFields: Fields = { name: "", message: "" };

function responseValue(data: unknown, key: string) {
  return data &&
    typeof data === "object" &&
    key in data &&
    typeof data[key as keyof typeof data] === "string"
    ? data[key as keyof typeof data]
    : undefined;
}

export function MessageForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [fields, setFields] = useState<Fields>(initialFields);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: FieldName, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError("");
    setSuccess("");
  }

  function validate() {
    const nextErrors: Errors = {};
    if (!fields.name.trim()) {
      nextErrors.name = "Enter your name.";
    } else if (fields.name.trim().length > MAX_NAME_LENGTH) {
      nextErrors.name = `Keep your name under ${MAX_NAME_LENGTH} characters.`;
    }
    if (!fields.message.trim()) {
      nextErrors.message = "Write a message.";
    } else if (fields.message.trim().length > MAX_MESSAGE_LENGTH) {
      nextErrors.message = `Keep your message under ${MAX_MESSAGE_LENGTH} characters.`;
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setGeneralError("");
    setSuccess("");
    if (Object.keys(nextErrors).length) {
      const first = (Object.keys(initialFields) as FieldName[]).find(
        (field) => nextErrors[field],
      );
      if (first) {
        document.getElementById(`globe-${first}`)?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/visitor-globe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          message: fields.message.trim(),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(retryMessage(response));
        }
        const error = responseValue(data, "error");
        throw new Error(
          error ?? "Unable to publish your message. Try again later.",
        );
      }
      setSuccess("Your message is on the globe.");
      setFields(initialFields);
      onSubmitted?.();
    } catch (caught) {
      setGeneralError(
        caught instanceof Error
          ? caught.message
          : "Unable to publish your message. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full border border-black/20 bg-transparent px-3 py-3 text-base leading-6 text-foreground outline-none placeholder:text-black/45 focus:border-black dark:border-white/25 dark:placeholder:text-white/45 dark:focus:border-white";

  const field = (name: FieldName, label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2">
      <label className="font-medium" htmlFor={`globe-${name}`}>
        {label}
      </label>
      {control}
      {errors[name] ? (
        <p
          className="text-black/70 dark:text-white/75"
          id={`globe-${name}-error`}
        >
          {errors[name]}
        </p>
      ) : null}
    </div>
  );

  return (
    <div>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {field(
          "name",
          "Name",
          <input
            autoComplete="name"
            className={inputClass}
            id="globe-name"
            maxLength={MAX_NAME_LENGTH}
            name="name"
            onChange={(e) => updateField("name", e.target.value)}
            value={fields.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "globe-name-error" : undefined}
            placeholder="Your name"
          />,
        )}
        {field(
          "message",
          "Message",
          <textarea
            className={`${inputClass} resize-none`}
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
            placeholder="Leave a message for everyone to see"
          />,
        )}
        {generalError ? (
          <p className="text-black/70 dark:text-white/75" role="alert">
            {generalError}
          </p>
        ) : null}
        <button
          className={`${actionClassName} transition-transform active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-black/45 dark:disabled:bg-white/45`}
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Publishing…" : "Publish message"}
        </button>
      </form>
      <p aria-live="polite" className="sr-only" role="status">
        {submitting ? "Publishing your message." : success}
      </p>
      {success ? (
        <p className="mt-6 text-black/75 dark:text-white/85">{success}</p>
      ) : null}
    </div>
  );
}
