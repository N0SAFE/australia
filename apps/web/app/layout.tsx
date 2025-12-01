import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { ReactNode } from "react";
import { Toaster } from "@repo/ui/components/shadcn/sonner";
import ReactQueryProviders from "@/utils/providers/ReactQueryProviders";
import { DynamicTanstackDevTools } from "@/components/devtools/DynamicTanstackDevTools";
import { SerwistProvider } from "@/lib/serwist-client";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdateNotification } from "@/components/pwa/UpdateNotification";

const PontanoSansFont = localFont({
  src: "../public/fonts/Pontano_Sans/PontanoSans-VariableFont_wght.ttf",
  variable: "--font-pontano-sans",
});

const PinyonScriptFont = localFont({
  src: "../public/fonts/Pinyon_Script/PinyonScript-Regular.ttf",
  variable: "--font-pinyon-script",
});

export const metadata: Metadata = {
  title: {
    default: "Gossip club",
    template: "%s | Gossip club",
  },
  description:
    "A private platform for friends to share photos, videos, and memorable moments with our friend in Australia. Stay connected across the distance.",
  keywords: [
    "photo sharing",
    "video sharing",
    "friends",
    "australia",
    "memories",
    "personal sharing",
    "long distance",
    "friendship",
  ],
  authors: [{ name: "N0SAFE" }],
  creator: "N0SAFE",
  publisher: "N0SAFE",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    title: "Go",
    description:
      "A private platform for friends to share photos, videos, and memorable moments with our friend in Australia.",
    siteName: "Gossip club",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gossip club",
    description:
      "A private platform for friends to share photos, videos, and memorable moments with our friend in Australia.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    // Standard web favicons (for browsers)
    icon: [
      { url: "/favicon_web.svg", type: "image/svg+xml", sizes: "16x16" },
      { url: "/favicon_web-2.svg", type: "image/svg+xml", sizes: "32x32" },
      { url: "/favicon_google.svg", type: "image/svg+xml", sizes: "48x48" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    // Apple Touch Icons (for iOS devices) - PNG required for iOS
    apple: [
      { url: "/favicon_apple.svg", type: "image/svg+xml", sizes: "60x60" },
      { url: "/favicon_apple-2.svg", type: "image/svg+xml", sizes: "180x180" },
      { url: "/favicon_ipad.svg", type: "image/svg+xml", sizes: "84x84" },
      { url: "/favicon_ipad-2.svg", type: "image/svg+xml", sizes: "167x167" },
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  manifest: "/site.webmanifest",
  verification: {
    // Add your verification codes when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gossip club",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${PontanoSansFont.variable} ${PinyonScriptFont.variable} antialiased`}
      >
        <SerwistProvider swUrl="/serwist/sw.js">
          <ReactQueryProviders>
            {children}

            <DynamicTanstackDevTools />
          </ReactQueryProviders>
          <Toaster richColors position="top-center" />
          <InstallPrompt />
          <UpdateNotification />
        </SerwistProvider>
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
