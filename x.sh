#!/bin/bash
set -euo pipefail

echo "🔧 Eliminando pnpm-workspace.yaml de forma definitiva (filesystem + git)..."

if [ -f "pnpm-workspace.yaml" ]; then
  git rm -f pnpm-workspace.yaml 2>/dev/null || rm -f pnpm-workspace.yaml
  echo "✅ pnpm-workspace.yaml eliminado y marcado para borrar en git"
else
  echo "ℹ️  pnpm-workspace.yaml no existe en el filesystem local"
fi

# Verificar si sigue trackeado en git aunque no exista en disco
if git ls-files --error-unmatch pnpm-workspace.yaml >/dev/null 2>&1; then
  echo "⚠️  Seguía trackeado en git, forzando remoción del índice..."
  git rm --cached -f pnpm-workspace.yaml
fi

echo ""
echo "🔍 Confirmación — no debería aparecer nada abajo:"
git ls-files | grep pnpm-workspace.yaml && echo "❌ TODAVÍA TRACKEADO" || echo "✅ Limpio, no está trackeado"

echo ""
echo "📦 Regenerando lockfile por las dudas..."
pnpm install --no-frozen-lockfile

echo ""
echo "✅ Listo. Verificá el 'git status' antes de commitear."
git status --short