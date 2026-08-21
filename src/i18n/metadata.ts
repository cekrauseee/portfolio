import type { Metadata } from "next";
import { localeDetails, type Locale } from "@/i18n/config";
import { site } from "@/config/site";

export function requestMetadata(
  locale: Locale,
  pathname: string,
  title: string,
  description: string,
  openGraphTitle = title,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      type: "website",
      url: pathname,
      title: openGraphTitle,
      description,
      siteName: site.name,
      locale: localeDetails[locale].openGraphLocale,
    },
  };
}
