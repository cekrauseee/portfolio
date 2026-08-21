"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  DARK_THEME_COLOR,
  defaultThemePreference,
  LIGHT_THEME_COLOR,
  parseThemePreference,
  serializeThemeCookie,
  THEME_COOKIE_NAME,
  THEME_MEDIA_QUERY,
  type ThemePreference,
} from "@/theme/config";

type ThemeContextValue = {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readThemeCookie() {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`),
  );
  if (!match) {
    return null;
  }

  try {
    return parseThemePreference(decodeURIComponent(match[1]));
  } catch {
    return defaultThemePreference;
  }
}

function applyThemeColor(isDark: boolean) {
  const themeColor = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((tag) => {
      // Next.js owns the metadata nodes. Mutating their structure breaks head
      // reconciliation during locale Server Actions, so only update content.
      tag.content = themeColor;
    });
}

function applyTheme(preference: ThemePreference) {
  const isDark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia(THEME_MEDIA_QUERY).matches);
  const root = document.documentElement;
  root.dataset.theme = preference;
  root.classList.toggle("dark", isDark);
  applyThemeColor(isDark);
  return isDark;
}

export function ThemeProvider({
  children,
  initialPreference = defaultThemePreference,
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreferenceState] = useState(() => {
    if (typeof document === "undefined") {
      return initialPreference;
    }
    return (
      readThemeCookie() ??
      parseThemePreference(document.documentElement.dataset.theme)
    );
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") {
      return initialPreference === "dark";
    }
    const currentPreference =
      readThemeCookie() ??
      parseThemePreference(document.documentElement.dataset.theme);
    return (
      currentPreference === "dark" ||
      (currentPreference === "system" &&
        window.matchMedia(THEME_MEDIA_QUERY).matches)
    );
  });

  useLayoutEffect(() => {
    // React may restore <html> to its server-rendered attributes during the
    // development remount. Reapply the browser cookie before the next paint.
    applyTheme(preference);
  }, [preference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const updateTheme = () => setIsDark(applyTheme(preference));

    updateTheme();
    if (preference !== "system") {
      return;
    }

    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    const secure = window.location.protocol === "https:";
    document.cookie = serializeThemeCookie(nextPreference, secure);
    setPreferenceState(nextPreference);
    setIsDark(applyTheme(nextPreference));
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, isDark, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
