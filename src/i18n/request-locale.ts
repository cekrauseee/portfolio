import { cookies, headers } from "next/headers";
import {
  getDeploymentCountry,
  LOCALE_COOKIE_NAME,
  resolveLocale,
} from "@/i18n/locale";

export async function getRequestLocale() {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);

  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    country: getDeploymentCountry(requestHeaders),
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}
