"use client";

import { useLayoutEffect, useRef } from "react";
import { preferenceOptionClassName } from "@/components/preference-option";
import { toggleSoundProps } from "@/components/links";
import { setLocalePreference } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";
import { stabilizeViewportAnchor } from "@/lib/viewport-scroll";

const languageAnchorStorageKey = "portfolio-language-anchor";

export function LanguageSwitcher({
  locale,
  labels,
  label,
}: {
  locale: Locale;
  labels: Record<Locale, string>;
  label: string;
}) {
  const buttonRefs = useRef<Partial<Record<Locale, HTMLButtonElement | null>>>(
    {},
  );
  const anchorFrameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const storedAnchor = sessionStorage.getItem(languageAnchorStorageKey);
    if (!storedAnchor) {
      return;
    }

    let parsedAnchor: unknown;
    try {
      parsedAnchor = JSON.parse(storedAnchor);
    } catch {
      sessionStorage.removeItem(languageAnchorStorageKey);
      return;
    }

    if (
      !parsedAnchor ||
      typeof parsedAnchor !== "object" ||
      !("locale" in parsedAnchor) ||
      !("top" in parsedAnchor) ||
      typeof parsedAnchor.locale !== "string" ||
      typeof parsedAnchor.top !== "number" ||
      !Number.isFinite(parsedAnchor.top)
    ) {
      sessionStorage.removeItem(languageAnchorStorageKey);
      return;
    }

    if (parsedAnchor.locale !== locale) {
      return;
    }

    const targetTop = parsedAnchor.top;

    sessionStorage.removeItem(languageAnchorStorageKey);

    let remainingFrames = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 2
      : 36;

    function keepButtonStable() {
      const button = buttonRefs.current[locale];
      if (!button) {
        anchorFrameRef.current = null;
        return;
      }

      stabilizeViewportAnchor(button, targetTop);

      remainingFrames -= 1;
      if (remainingFrames > 0) {
        anchorFrameRef.current = requestAnimationFrame(keepButtonStable);
      } else {
        button.focus({ preventScroll: true });
        anchorFrameRef.current = null;
      }
    }

    anchorFrameRef.current = requestAnimationFrame(keepButtonStable);

    return () => {
      if (anchorFrameRef.current !== null) {
        cancelAnimationFrame(anchorFrameRef.current);
        anchorFrameRef.current = null;
      }
    };
  }, [locale]);

  return (
    <fieldset className="w-max min-w-0">
      <legend className="sr-only">{label}</legend>
      <form
        action={setLocalePreference}
        className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1"
      >
        {locales.map((candidate) => (
          <button
            {...toggleSoundProps}
            className={`${preferenceOptionClassName} ${candidate === locale ? "font-medium underline" : ""}`}
            onClick={(event) => {
              if (candidate === locale) {
                return;
              }

              sessionStorage.setItem(
                languageAnchorStorageKey,
                JSON.stringify({
                  locale: candidate,
                  top: event.currentTarget.getBoundingClientRect().top,
                }),
              );
            }}
            ref={(button) => {
              buttonRefs.current[candidate] = button;
            }}
            type="submit"
            name="locale"
            value={candidate}
            aria-pressed={candidate === locale}
            key={candidate}
          >
            {labels[candidate]}
          </button>
        ))}
      </form>
    </fieldset>
  );
}
