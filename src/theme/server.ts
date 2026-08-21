import "server-only";

import { cookies } from "next/headers";
import {
  parseThemePreference,
  THEME_COOKIE_NAME,
  type ThemePreference,
} from "@/theme/config";

export async function getThemePreference(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  return parseThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value);
}
