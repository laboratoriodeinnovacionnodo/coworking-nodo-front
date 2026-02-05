import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NODO - Sistema de Gestión de Asientos",
  description: "Gestión de asientos en tiempo real para espacios de coworking NODO",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NODO",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/nodo-logo.png",
    apple: "/nodo-logo.png",
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#26a7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#26a7fc" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NODO" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/nodo-logo.png" />
        <link rel="apple-touch-icon" href="/nodo-logo.png" />
        <meta name="theme-color" content="#26a7fc" />
      </head>
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then((registration) => {
                    console.log('[PWA] Service Worker registered:', registration);
                  }).catch((error) => {
                    console.log('[PWA] Service Worker registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
