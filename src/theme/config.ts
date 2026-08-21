export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export const defaultThemePreference: ThemePreference = "system";
export const THEME_COOKIE_NAME = "portfolio-theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const LIGHT_THEME_COLOR = "#fafafa";
export const DARK_THEME_COLOR = "#070707";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    themePreferences.includes(value as ThemePreference)
  );
}

export function parseThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : defaultThemePreference;
}

export function serializeThemeCookie(
  preference: ThemePreference,
  secure = false,
) {
  return [
    `${THEME_COOKIE_NAME}=${encodeURIComponent(preference)}`,
    `Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
