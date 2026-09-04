import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { BottomNavbar } from "@/components/bottom-navbar"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NODO - Sistema de Gestión de Asientos",
  description: "Gestión de asientos en tiempo real para espacios de coworking NODO",
  icons: {
    icon:  "/nodo-logo.png",
    apple: "/nodo-logo.png",
  },
}

export const viewport: Viewport = {
  width:         "device-width",
  initialScale:  1,
  minimumScale:  1,
  maximumScale:  5,
  userScalable:  true,
  viewportFit:   "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#26a7fc" },
    { media: "(prefers-color-scheme: dark)",  color: "#26a7fc" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={geist.className}>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <BottomNavbar />
        </AuthProvider>
      </body>
    </html>
  )
}
