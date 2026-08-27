import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Pacifico } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cursive",
})

export const metadata: Metadata = {
  title: "SpeedyCheck - Check Your Internet Speed",
  description: "Test your internet connection speed with our fast and accurate speed test tool",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f0f",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} ${pacifico.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
