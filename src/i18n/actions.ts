"use server";

import { cookies } from "next/headers";
import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  parseLocalePreference,
} from "@/i18n/locale";

export async function setLocalePreference(formData: FormData) {
  const locale = parseLocalePreference(formData.get("locale"));
  if (!locale) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: LOCALE_COOKIE_NAME,
    value: locale,
    httpOnly: true,
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
