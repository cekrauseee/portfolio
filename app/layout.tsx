import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Henrique Krause, Software Engineer",
  description:
    "Software engineer building thoughtful products, interfaces, and tools for humans and agents.",
};

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} min-h-full min-w-0 overscroll-none bg-background [color-scheme:light_dark] [-webkit-text-size-adjust:100%] [text-size-adjust:100%]`}
    >
      <body className="min-h-full min-w-0 overscroll-none bg-background font-mono text-sm leading-5 text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
