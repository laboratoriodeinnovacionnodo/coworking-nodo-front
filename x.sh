#!/bin/bash
set -euo pipefail

echo "🔧 Corrigiendo pnpm-workspace.yaml inválido..."

if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "ℹ️  No existe pnpm-workspace.yaml, nada que hacer."
  exit 0
fi

if [ ! -f "package.json" ]; then
  echo "❌ No se encontró package.json en el directorio actual."
  exit 1
fi

cp package.json package.json.bak

node <<'EOF'
const fs = require("fs");

const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const overrides = {
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

pkg.pnpm = pkg.pnpm || {};
pkg.pnpm.overrides = { ...(pkg.pnpm.overrides || {}), ...overrides };

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("✅ overrides movidos a package.json → pnpm.overrides");
EOF

rm pnpm-workspace.yaml
echo "✅ pnpm-workspace.yaml eliminado"

echo ""
echo "🔍 Verificá que package.json quedó bien:"
grep -A 20 '"pnpm"' package.json || true

echo ""
echo "✅ Listo. Corré 'pnpm install' localmente para regenerar el lockfile antes de commitear."