"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { mutedButtonClassName } from "@/components/links";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

export function PreferencesMenu({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["navigation"];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`${mutedButtonClassName} inline-flex min-h-8 items-center text-sm`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {dictionary.preferencesNavigation}
      </button>

      {open ? (
        <div
          id={panelId}
          className="bg-background text-foreground absolute top-full right-0 z-40 mt-2 flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-5 p-4 shadow-[0_12px_40px_rgb(0_0_0/0.18)] outline outline-black/10 dark:shadow-[0_12px_40px_rgb(0_0_0/0.55)] dark:outline-white/15"
          role="region"
          aria-label={dictionary.preferencesNavigation}
        >
          <LanguageSwitcher
            locale={locale}
            labels={dictionary.languages}
            label={dictionary.languageNavigation}
          />
          <ThemeSwitcher
            labels={dictionary.appearance}
            label={dictionary.appearanceNavigation}
          />
        </div>
      ) : null}
    </div>
  );
}
