#!/bin/bash
set -e
 
echo "🚀 [v4] Moviendo EVENTOS_API a variable de entorno..."
 
# ──────────────────────────────────────────────
# 1. Reemplazar la constante hardcodeada en la página
# ──────────────────────────────────────────────
sed -i 's|const EVENTOS_API = "https://api.eventos.nodo.cc.gob.ar/api"|const EVENTOS_API = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? "https://api.eventos.nodo.cc.gob.ar/api"|' app/calendario/page.tsx
 
echo "✅ app/calendario/page.tsx actualizado"
 
# ──────────────────────────────────────────────
# 2. Agregar la variable al .env.example si existe,
#    o crearlo si no existe
# ──────────────────────────────────────────────
if [ -f ".env.example" ]; then
  if ! grep -q "NEXT_PUBLIC_EVENTOS_API_URL" .env.example; then
    echo "" >> .env.example
    echo "# API pública de eventos NODO" >> .env.example
    echo "NEXT_PUBLIC_EVENTOS_API_URL=https://api.eventos.nodo.cc.gob.ar/api" >> .env.example
    echo "✅ .env.example actualizado"
  else
    echo "ℹ️  NEXT_PUBLIC_EVENTOS_API_URL ya está en .env.example"
  fi
else
  cat > .env.example << 'EOF'
# API pública de eventos NODO
NEXT_PUBLIC_EVENTOS_API_URL=https://api.eventos.nodo.cc.gob.ar/api
EOF
  echo "✅ .env.example creado"
fi
 
# ──────────────────────────────────────────────
# 3. Agregar al deploy.yml como build-arg y -e en docker run
# ──────────────────────────────────────────────
DEPLOY=".github/workflows/deploy.yml"
 
if grep -q "NEXT_PUBLIC_EVENTOS_API_URL" "$DEPLOY"; then
  echo "ℹ️  NEXT_PUBLIC_EVENTOS_API_URL ya está en deploy.yml"
else
  # build-args block
  sed -i 's|            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}|            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}\n            NEXT_PUBLIC_EVENTOS_API_URL=${{ secrets.NEXT_PUBLIC_EVENTOS_API_URL }}|' "$DEPLOY"
 
  # docker run -e block
  sed -i 's|              -e NEXT_PUBLIC_API_URL="${{ secrets.NEXT_PUBLIC_API_URL }}" \\|              -e NEXT_PUBLIC_API_URL="${{ secrets.NEXT_PUBLIC_API_URL }}" \\\n              -e NEXT_PUBLIC_EVENTOS_API_URL="${{ secrets.NEXT_PUBLIC_EVENTOS_API_URL }}" \\|' "$DEPLOY"
 
  echo "✅ deploy.yml actualizado con build-arg y docker run -e"
fi
 
echo ""
echo "⚠️  Acordate de agregar el secret en GitHub:"
echo "   Settings → Secrets → Actions → New secret"
echo "   Nombre: NEXT_PUBLIC_EVENTOS_API_URL"
echo "   Valor:  https://api.eventos.nodo.cc.gob.ar/api"
echo ""
echo "git add . && git commit -m \"feat: EVENTOS_API como variable de entorno\" && git push origin main"