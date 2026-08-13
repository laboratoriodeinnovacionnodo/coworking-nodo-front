#!/bin/bash
set -euo pipefail

echo "🔧 Corrigiendo formato de 'overrides' en package.json..."

if [ ! -f "package.json" ]; then
  echo "❌ No se encontró package.json en el directorio actual."
  exit 1
fi

cp package.json package.json.bak

node <<'EOF'
const fs = require("fs");

const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

// Tomar overrides desde donde estén (pnpm.overrides o ya en top-level)
const overrides = (pkg.pnpm && pkg.pnpm.overrides) || pkg.overrides || {
  "next@>=16.0.0-beta.0 <16.1.7": ">=16.1.7",
  "next@>=16.0.1 <16.1.7": ">=16.1.7",
  "lodash@>=4.0.0 <=4.17.23": ">=4.18.0",
  "lodash@<=4.17.23": ">=4.18.0",
  "next@>=16.0.0-beta.0 <16.2.3": ">=16.2.3",
  "postcss@<8.5.10": ">=8.5.10",
  "next@>=16.0.0 <16.2.5": ">=16.2.5",
  "next@>=16.0.0 <16.2.6": ">=16.2.6",
  "sharp@<0.35.0": ">=0.35.0",
  "next@>=16.0.0 <16.2.11": ">=16.2.11",
  "postcss@<=8.5.11": ">=8.5.12",
  "postcss@<=8.5.17": ">=8.5.18",
  "postcss@<=8.5.22": ">=8.5.23",
  "nanoid@<3.3.16": ">=3.3.16",
  "nanoid@<3.3.17": ">=3.3.17"
};

// Mover a top-level "overrides" (formato que pnpm moderno lee)
pkg.overrides = overrides;

// Limpiar el campo pnpm.overrides obsoleto
if (pkg.pnpm) {
  delete pkg.pnpm.overrides;
  if (Object.keys(pkg.pnpm).length === 0) {
    delete pkg.pnpm;
  }
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("✅ overrides movidos a package.json → overrides (top-level)");
EOF

echo ""
echo "📦 Regenerando pnpm-lock.yaml (esto puede tardar unos segundos)..."
pnpm install --no-frozen-lockfile

echo ""
echo "🔍 Verificá el resultado:"
grep -A 20 '"overrides"' package.json || true

echo ""
echo "✅ Listo. Revisá que 'pnpm build' funcione localmente antes de commitear."