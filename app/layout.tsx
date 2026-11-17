import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import PwaRegister from "@/components/pwa-register"
import CookieConsent from "@/components/cookie-consent"
import { BASE_PATH, siteOrigin, withBasePath } from "@/lib/site"
import "./globals.css"


export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "SpeedyCheck - Check Your Internet Speed",
  description: "Measure download, upload, ping, jitter and packet loss in your browser, then compare the result with your plan.",
  applicationName: "SpeedyCheck",
  appleWebApp: {
    capable: true,
    title: "SpeedyCheck",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: withBasePath("/apple-touch-icon.png"),
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
    >
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
        <PwaRegister />
        <CookieConsent />
      </body>
    </html>
  )
}
