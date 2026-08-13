#!/bin/bash
set -euo pipefail

echo "🔧 Configurando onlyBuiltDependencies para permitir scripts de sharp y otros binarios nativos..."

if [ ! -f "package.json" ]; then
  echo "❌ No se encontró package.json en el directorio actual."
  exit 1
fi

cp package.json package.json.bak

node <<'EOF'
const fs = require("fs");

const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

pkg.pnpm = pkg.pnpm || {};

const existing = new Set(pkg.pnpm.onlyBuiltDependencies || []);

// Paquetes comunes con binarios nativos que necesitan correr postinstall
[
  "sharp",
  "@tailwindcss/oxide",
  "unrs-resolver"
].forEach(dep => existing.add(dep));

pkg.pnpm.onlyBuiltDependencies = Array.from(existing).sort();

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("✅ onlyBuiltDependencies configurado:", pkg.pnpm.onlyBuiltDependencies);
EOF

echo ""
echo "📦 Regenerando lockfile con la nueva config..."
pnpm install --no-frozen-lockfile

echo ""
echo "🔍 Verificando que no queden builds ignorados..."
pnpm install --frozen-lockfile 2>&1 | tee /tmp/pnpm-check.log

if grep -q "ERR_PNPM_IGNORED_BUILDS" /tmp/pnpm-check.log; then
  echo "❌ Todavía hay builds ignorados. Revisá el log arriba y agregá el paquete faltante al script."
  exit 1
fi

echo ""
echo "✅ Listo. pnpm install --frozen-lockfile pasa limpio, igual que en Docker."