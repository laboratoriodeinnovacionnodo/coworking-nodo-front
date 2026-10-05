#!/usr/bin/env bash
# ============================================================================
#  v34-front-fix-adminsapi.sh  — coworking-front
#
#  Fix: auth-context.tsx importa "adminsApi" pero en v34 el export
#  se llama "adminApi". Se agrega el alias adminsApi = adminApi en api.ts
#  para mantener compatibilidad sin tocar auth-context.tsx.
# ============================================================================
set -euo pipefail

[[ -f "package.json" && -d "app" ]] || {
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
}

echo "════════════════════════════════════════════════════════"
echo "  v34-front-fix-adminsapi  |  coworking-front"
echo "════════════════════════════════════════════════════════"
echo ""

# Agrega el alias al final de lib/api.ts (antes del export default)
# Usa una línea de sustitución segura con sed
echo "📝  Agregando alias adminsApi en lib/api.ts..."

# Verificar que el archivo existe
[[ -f "lib/api.ts" ]] || { echo "❌  lib/api.ts no encontrado"; exit 1; }

# Verificar que el alias no existe ya
if grep -q "adminsApi" lib/api.ts; then
  echo "  ℹ️  El alias adminsApi ya existe, sin cambios."
else
  # Agregar el alias justo antes del "export { statusMap" al final
  cat >> lib/api.ts << 'EOF'

// Alias de compatibilidad — auth-context.tsx usa adminsApi
export const adminsApi = adminApi
EOF
  echo "  ✅  Alias adminsApi agregado"
fi

echo ""
echo "🔨  Build de verificación..."
pnpm build

echo ""
echo "✅  v34-front-fix-adminsapi completado"