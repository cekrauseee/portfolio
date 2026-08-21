"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { actionClassName, focusVisibleClassName } from "@/components/links";
import { localeTag, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { MAX_ROLE_DESCRIPTION_LENGTH } from "@/features/role-fit/constants";
import { retryMessage, shouldUseRetryMessage } from "@/lib/retry-message";

const WORD_INTERVAL_MS = 24;

type Status = "idle" | "loading" | "revealing" | "done" | "error";

type RoleFitDictionary = Dictionary["fit"]["form"];

function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

export function RoleFitForm({
  locale,
  dictionary,
  retry,
}: {
  locale: Locale;
  dictionary: RoleFitDictionary;
  retry: Dictionary["retry"];
}) {
  const [description, setDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const revealTimer = useRef<number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const characterCount = interpolate(dictionary.characterCount, {
    count: description.length,
    max: MAX_ROLE_DESCRIPTION_LENGTH.toLocaleString(localeTag(locale)),
  });
  const wordEndOffsets = useMemo(
    () =>
      Array.from(
        answer.matchAll(/\S+(?:\s+|$)/g),
        (match) => (match.index ?? 0) + match[0].length,
      ),
    [answer],
  );
  const visibleAnswer =
    visibleWordCount === 0
      ? ""
      : answer.slice(
          0,
          wordEndOffsets[Math.min(visibleWordCount, wordEndOffsets.length) - 1],
        );

  useEffect(() => {
    return () => {
      if (revealTimer.current !== undefined) {
        window.clearTimeout(revealTimer.current);
      }
    };
  }, []);

  function clearRevealTimer() {
    if (revealTimer.current !== undefined) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = undefined;
    }
  }

  function revealAnswer(nextAnswer: string) {
    const words = Array.from(nextAnswer.matchAll(/\S+(?:\s+|$)/g));

    setAnswer(nextAnswer);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleWordCount(words.length);
      setStatus("done");
      return;
    }

    setVisibleWordCount(0);
    setStatus("revealing");

    let nextWord = 0;
    const revealNextWord = () => {
      nextWord += 1;
      setVisibleWordCount(nextWord);

      if (nextWord === words.length) {
        revealTimer.current = undefined;
        setStatus("done");
        return;
      }

      revealTimer.current = window.setTimeout(revealNextWord, WORD_INTERVAL_MS);
    };

    revealNextWord();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = description.trim();
    if (!input) {
      setError(dictionary.emptyDescription);
      setStatus("error");
      textareaRef.current?.focus();
      return;
    }

    clearRevealTimer();
    setAnswer("");
    setVisibleWordCount(0);
    setError("");
    setStatus("loading");

    try {
      const response = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(
          shouldUseRetryMessage(response)
            ? retryMessage(response, retry)
            : dictionary.unableToAssess,
        );
        setStatus("error");
        return;
      }

      if (
        !data ||
        typeof data !== "object" ||
        !("answer" in data) ||
        typeof data.answer !== "string"
      ) {
        setError(dictionary.unableToAssess);
        setStatus("error");
        return;
      }

      revealAnswer(data.answer);
    } catch {
      setError(dictionary.connectionError);
      setStatus("error");
    }
  }

  const isBusy = status === "loading" || status === "revealing";

  return (
    <div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="font-medium" htmlFor="role-description">
            {dictionary.roleDescription}
          </label>
          <textarea
            aria-describedby={
              error ? "role-description-error" : "role-description-hint"
            }
            aria-invalid={Boolean(error)}
            className={`min-h-52 w-full resize-y border border-black/20 bg-transparent px-3 py-3 text-base leading-6 outline-none placeholder:text-black/45 focus:border-black dark:border-white/25 dark:placeholder:text-white/45 dark:focus:border-white ${focusVisibleClassName}`}
            disabled={isBusy}
            id="role-description"
            maxLength={MAX_ROLE_DESCRIPTION_LENGTH}
            name="role-description"
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder={dictionary.placeholder}
            ref={textareaRef}
            value={description}
          />
          <p
            className="text-black/60 dark:text-white/65"
            id="role-description-hint"
          >
            {characterCount}
          </p>
        </div>

        {error ? (
          <p
            className="text-black/70 dark:text-white/75"
            id="role-description-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          className={`${actionClassName} disabled:cursor-not-allowed disabled:bg-black/45 dark:disabled:bg-white/45`}
          disabled={isBusy}
          type="submit"
        >
          {status === "loading" ? dictionary.assessing : dictionary.assess}
        </button>
      </form>

      <p className="sr-only" aria-live="polite" role="status">
        {status === "loading"
          ? dictionary.assessing
          : status === "done"
            ? dictionary.assessmentReady
            : ""}
      </p>

      {answer ? (
        <section className="mt-10" aria-labelledby="fit-assessment">
          <h2 className="text-lg leading-7 font-medium" id="fit-assessment">
            {dictionary.assessment}
          </h2>
          <p className="mt-3 text-base leading-7 whitespace-pre-wrap text-black/75 dark:text-white/85">
            {visibleAnswer}
          </p>
        </section>
      ) : null}

      {status === "done" ? (
        <div className="mt-8">
          <Link className={actionClassName} href="/schedule">
            {dictionary.scheduleConversation}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
