"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { actionClassName } from "@/components/external-link";

const MAX_DESCRIPTION_LENGTH = 16_000;
const MAX_DESCRIPTION_LABEL = "16,000";
const WORD_INTERVAL_MS = 24;

type Status = "idle" | "loading" | "revealing" | "done" | "error";

export function PositionFitForm() {
  const [description, setDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const revealTimer = useRef<number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setError("Paste a role description before assessing the fit.");
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
        if (
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
        ) {
          throw new Error(data.error);
        }

        throw new Error("Unable to assess fit. Try again.");
      }

      if (
        !data ||
        typeof data !== "object" ||
        !("answer" in data) ||
        typeof data.answer !== "string"
      ) {
        throw new Error("Unable to assess fit. Try again.");
      }

      revealAnswer(data.answer);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to assess fit. Check your connection and try again.",
      );
      setStatus("error");
    }
  }

  const isBusy = status === "loading" || status === "revealing";

  return (
    <div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="font-medium" htmlFor="role-description">
            Role description
          </label>
          <textarea
            aria-describedby={
              error ? "role-description-error" : "role-description-hint"
            }
            aria-invalid={Boolean(error)}
            className="min-h-52 w-full resize-y border border-black/20 bg-transparent px-3 py-3 text-base leading-6 outline-none placeholder:text-black/45 focus:border-black dark:border-white/25 dark:placeholder:text-white/45 dark:focus:border-white"
            disabled={isBusy}
            id="role-description"
            maxLength={MAX_DESCRIPTION_LENGTH}
            name="role-description"
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder="Paste the role description."
            ref={textareaRef}
            value={description}
          />
          <p
            className="text-black/60 dark:text-white/65"
            id="role-description-hint"
          >
            {description.length} / {MAX_DESCRIPTION_LABEL}
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
          {status === "loading" ? "Assessing fit…" : "Assess fit"}
        </button>
      </form>

      <p className="sr-only" aria-live="polite" role="status">
        {status === "loading"
          ? "Assessing fit."
          : status === "done"
            ? "Fit assessment ready."
            : ""}
      </p>

      {answer ? (
        <section className="mt-10" aria-labelledby="fit-assessment">
          <h2 className="text-lg leading-7 font-medium" id="fit-assessment">
            Fit assessment
          </h2>
          <p className="mt-3 text-base leading-7 whitespace-pre-wrap text-black/75 dark:text-white/85">
            {visibleAnswer}
          </p>
        </section>
      ) : null}

      {status === "done" ? (
        <div className="mt-8">
          <Link className={actionClassName} href="/schedule">
            Schedule a conversation
          </Link>
        </div>
      ) : null}
    </div>
  );
}
