import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/config/site";
import { profile } from "@/content/portfolio";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#070707" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={localeDetails[locale].languageTag}
      className={`${geistSans.variable} bg-background min-h-full min-w-0 overscroll-none [color-scheme:light_dark] [-webkit-text-size-adjust:100%] [text-size-adjust:100%]`}
    >
      <body className="bg-background text-foreground min-h-full min-w-0 overscroll-none font-sans text-sm leading-5 antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
