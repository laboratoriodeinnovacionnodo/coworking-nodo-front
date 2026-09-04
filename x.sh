#!/usr/bin/env bash
# ============================================================================
#  v13-remove-vercel-analytics.sh  — coworking-front
#
#  Problema: @vercel/analytics hace una request a /_vercel/insights/script.js
#  que no existe en el Droplet → timeout → traba la carga de la app.
#
#  Fix:
#    · Elimina el import y el componente <Analytics /> de app/layout.tsx
#    · Desinstala @vercel/analytics del package.json
#
#  Uso:
#    cd coworking-front
#    chmod +x v13-remove-vercel-analytics.sh
#    ./v13-remove-vercel-analytics.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔧  v13 — Quitar Vercel Analytics                              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ── app/layout.tsx ───────────────────────────────────────────────────────────
echo "📄  app/layout.tsx..."

# Quitar la línea del import
sed -i "s|import { Analytics } from \"@vercel/analytics/next\"||g" app/layout.tsx
sed -i "s|import { Analytics } from '@vercel/analytics/next'||g" app/layout.tsx

# Quitar el componente <Analytics /> (con o sin espacios/tabs)
sed -i "s|[[:space:]]*<Analytics />||g" app/layout.tsx
sed -i "s|[[:space:]]*<Analytics/>||g"  app/layout.tsx

# Quitar líneas vacías que hayan quedado dobles (máximo 1 línea en blanco seguida)
cat -s app/layout.tsx > /tmp/layout_clean.tsx && mv /tmp/layout_clean.tsx app/layout.tsx

echo "✅  app/layout.tsx — Analytics removido"

# ── package.json — desinstalar el paquete ────────────────────────────────────
echo "📦  Desinstalando @vercel/analytics..."
pnpm remove @vercel/analytics
echo "✅  @vercel/analytics desinstalado"

# ── Build ────────────────────────────────────────────────────────────────────
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v13 completado — Vercel Analytics eliminado                ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Cambios:"
echo "    · app/layout.tsx  → sin import ni <Analytics />"
echo "    · package.json    → @vercel/analytics desinstalado"
echo ""
echo "  La app ya no hace requests a /_vercel/insights/script.js"
echo ""