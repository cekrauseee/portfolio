"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import type { Locale } from "@/i18n/config";
import { playLocaleTransition } from "@/i18n/locale-transition";

export function LocaleTransition({
  locale,
  className,
  children,
}: {
  locale: Locale;
  className: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (rootRef.current) {
      return playLocaleTransition(rootRef.current, locale);
    }
  }, [locale, children]);

  return (
    <div
      ref={rootRef}
      className={`${className} data-[locale-layout]:overflow-visible`}
      data-locale-content
    >
      {children}
    </div>
  );
}
