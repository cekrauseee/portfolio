import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/config/site";
import { profile } from "@/content/portfolio";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  type ThemePreference,
} from "@/theme/config";
import { getThemePreference } from "@/theme/server";
import { ThemeProvider } from "@/theme/theme-provider";
import { ThemeScript } from "@/theme/theme-script";
import { InteractionSounds } from "@/components/interaction-sounds";
import { localeDetails } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  return {
    metadataBase: new URL(site.url),
    title: {
      default: dictionary.site.title,
      template: `%s · ${dictionary.site.title}`,
    },
    description: dictionary.site.description,
    applicationName: site.name,
    authors: [{ name: profile.name, url: site.url }],
    creator: profile.name,
    publisher: profile.name,
    category: "technology",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      title: dictionary.site.title,
      description: dictionary.site.description,
      siteName: site.name,
      locale: localeDetails[locale].openGraphLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.site.title,
      description: dictionary.site.description,
      creator: `@${site.xHandle}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const preference = await getThemePreference();
  const themeColor = themeColorForPreference(preference);

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: preference === "system" ? "light dark" : preference,
    themeColor,
  };
}

function themeColorForPreference(preference: ThemePreference) {
  if (preference === "light") {
    return [{ color: LIGHT_THEME_COLOR }];
  }
  if (preference === "dark") {
    return [{ color: DARK_THEME_COLOR }];
  }
  return [
    { media: "(prefers-color-scheme: light)", color: LIGHT_THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: DARK_THEME_COLOR },
  ];
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, preference] = await Promise.all([
    getRequestLocale(),
    getThemePreference(),
  ]);
  const initialDark = preference === "dark";

  return (
    <html
      lang={localeDetails[locale].languageTag}
      data-theme={preference}
      suppressHydrationWarning
      className={`${geistSans.variable} ${initialDark ? "dark" : ""} bg-background min-h-full min-w-0 overscroll-none [-webkit-text-size-adjust:100%] [text-size-adjust:100%]`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-background text-foreground min-h-full min-w-0 overscroll-none font-sans text-sm leading-5 antialiased">
        <ThemeProvider initialPreference={preference}>
          <InteractionSounds />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
