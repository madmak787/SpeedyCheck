import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Pacifico } from "next/font/google"
import PwaRegister from "@/components/pwa-register"
import BrandCursor from "@/components/brand-cursor"
import CookieConsent from "@/components/cookie-consent"
import { BASE_PATH, siteOrigin, withBasePath } from "@/lib/site"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cursive",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "SpeedyCheck - Check Your Internet Speed",
  description: "Test your internet connection speed with our fast and accurate speed test tool",
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
  maximumScale: 1,
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
      style={
        {
          "--cursor-default": `url("${BASE_PATH}/cursors/default.png") 4 2, auto`,
          "--cursor-pointer": `url("${BASE_PATH}/cursors/pointer.png") 16 16, pointer`,
          "--cursor-text": `url("${BASE_PATH}/cursors/text.png") 16 16, text`,
        } as React.CSSProperties
      }
    >
      <body className={`${geist.variable} ${geistMono.variable} ${pacifico.variable} font-sans antialiased`}>
        {children}
        <BrandCursor />
        <PwaRegister />
        <CookieConsent />
      </body>
    </html>
  )
}
