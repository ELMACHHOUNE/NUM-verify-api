import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Root layout.
 *
 * Intentionally holds only the document shell and providers. The public
 * navigation, footer and visitor tracker live in `app/(public)/layout.tsx`, so
 * the `/admin` area can render its own chrome without inheriting it.
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "InsightHub — Phone intelligence & visitor analytics",
    template: "%s · InsightHub",
  },
  description:
    "Validate phone numbers with Numverify and understand your audience with privacy-first visitor analytics powered by IPstack and MongoDB.",
  keywords: [
    "phone number validation",
    "phone lookup",
    "numverify",
    "line type",
    "carrier lookup",
    "visitor analytics",
    "ip geolocation",
  ],
  applicationName: "InsightHub",
  authors: [{ name: "InsightHub" }],
  openGraph: {
    type: "website",
    siteName: "InsightHub",
    title: "InsightHub — Phone intelligence & visitor analytics",
    description:
      "Instant phone validation plus privacy-first visitor analytics: geography, devices, referrers and activity over time.",
  },
  twitter: {
    card: "summary_large_image",
    title: "InsightHub — Phone intelligence & visitor analytics",
    description:
      "Instant phone validation plus privacy-first visitor analytics: geography, devices, referrers and activity over time.",
  },
  robots: { index: true, follow: true },
};

/** Admin pages must never be indexed. */
export const robotsForAdmin = {
  index: false,
  follow: false,
  nocache: true,
} as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}