#!/usr/bin/env bash
# ============================================================================
#  v22-ui-max-width-2xl.sh  — coworking-front
#  Cambia max-w-6xl → max-w-screen-2xl (1536px) en app/page.tsx
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"; exit 1
fi

echo "📄  Actualizando max-w en app/page.tsx..."
sed -i 's/max-w-6xl/max-w-screen-2xl/g' app/page.tsx
echo "✅  max-w-6xl → max-w-screen-2xl"

echo ""
echo "🔨  Compilando..."
pnpm build

echo "✅  Listo — contenedor ahora es 1536px"