"use client";

import { preferenceOptionClassName } from "@/components/preference-option";
import { themePreferences, type ThemePreference } from "@/theme/config";
import { useTheme } from "@/theme/theme-provider";

export function ThemeSwitcher({
  labels,
  label,
}: {
  labels: Record<ThemePreference, string>;
  label: string;
}) {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="w-max min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
        {themePreferences.map((candidate) => (
          <button
            className={`${preferenceOptionClassName} ${candidate === preference ? "font-medium underline" : ""}`}
            type="button"
            aria-pressed={candidate === preference}
            key={candidate}
            onClick={() => setPreference(candidate)}
          >
            {labels[candidate]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
