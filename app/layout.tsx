import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "PULSAR",
  description: "Закрытый сервис частного доступа.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      className={`${inter.variable} ${geistMono.variable} dark`}
      lang="ru"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors theme="dark" />
        </TooltipProvider>
      </body>
    </html>
  )
}
