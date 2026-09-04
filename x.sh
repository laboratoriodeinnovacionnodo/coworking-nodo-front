#!/usr/bin/env bash
# ============================================================================
#  v15-remove-pwa-logs.sh  — coworking-front
#
#  Elimina:
#    · PWA completo (sw.js, registro en layout, headers en next.config)
#    · Todos los console.log/warn/error de [v0] en hooks/use-seats.ts
#
#  Uso:
#    cd coworking-front
#    chmod +x v15-remove-pwa-logs.sh
#    ./v15-remove-pwa-logs.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔧  v15 — Eliminar PWA y logs de consola                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# 1. Eliminar sw.js
# ════════════════════════════════════════════════════════════════════════════
echo "🗑  Eliminando public/sw.js..."
rm -f public/sw.js
echo "✅  public/sw.js eliminado"

# ════════════════════════════════════════════════════════════════════════════
# 2. app/layout.tsx — quitar registro del SW, Analytics, y metas PWA
# ════════════════════════════════════════════════════════════════════════════
echo "📄  app/layout.tsx..."
cat > app/layout.tsx << 'EOF'
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
EOF
echo "✅  app/layout.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 3. next.config.mjs — quitar headers de sw.js y manifest
# ════════════════════════════════════════════════════════════════════════════
echo "📄  next.config.mjs..."
cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
EOF
echo "✅  next.config.mjs"

# ════════════════════════════════════════════════════════════════════════════
# 4. hooks/use-seats.ts — eliminar todos los console.log de [v0]
# ════════════════════════════════════════════════════════════════════════════
echo "📄  hooks/use-seats.ts — eliminando console.log..."
# Eliminar líneas que contengan console.log/warn/error con [v0]
sed -i '/console\.\(log\|warn\|error\).*\[v0\]/d' hooks/use-seats.ts
# Eliminar cualquier otro console.log suelto en el archivo
sed -i '/console\.\(log\|warn\|error\)/d' hooks/use-seats.ts
echo "✅  hooks/use-seats.ts"

# ════════════════════════════════════════════════════════════════════════════
# 5. Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v15-remove-pwa-logs.sh completado                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Cambios:"
echo "    · public/sw.js         → eliminado"
echo "    · app/layout.tsx       → sin SW, sin Analytics, sin metas PWA"
echo "    · next.config.mjs      → sin headers de sw.js/manifest"
echo "    · hooks/use-seats.ts   → sin console.log"
echo ""
echo "  ⚠️  Los errores de contentscript.js y MaxListenersExceeded"
echo "     son de MetaMask/extensiones del navegador — no los podés"
echo "     eliminar desde tu código. No afectan la app."
echo ""