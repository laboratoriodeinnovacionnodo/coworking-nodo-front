#!/bin/bash
set -euo pipefail

echo "🔧 Diagnóstico y limpieza completa de overrides + workspace..."

if [ ! -f "package.json" ]; then
  echo "❌ No se encontró package.json en el directorio actual."
  exit 1
fi

cp package.json package.json.bak

# 1) Eliminar pnpm-workspace.yaml si existe (root del error original)
if [ -f "pnpm-workspace.yaml" ]; then
  echo "🗑️  Eliminando pnpm-workspace.yaml (causa del error 'packages field missing')..."
  rm pnpm-workspace.yaml
else
  echo "ℹ️  pnpm-workspace.yaml no existe localmente (verificá si sigue en git remoto)."
fi

# 2) Reescribir overrides sin conflictos con dependencias directas
node <<'EOF'
const fs = require("fs");

const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const directDeps = {
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {})
};

// Overrides candidatos originales (formato pnpm: "pkg@range")
const rawOverrides = pkg.overrides || (pkg.pnpm && pkg.pnpm.overrides) || {};

const cleanOverrides = {};

for (const [key, value] of Object.entries(rawOverrides)) {
  // key puede venir como "next@>=16.0.0 <16.2.11" o simplemente "next"
  const pkgName = key.split("@")[0].trim() || key.split(/@(?!.*@)/)[0];
  const realName = key.startsWith("@") ? key.split("@").slice(0,2).join("@") : key.split("@")[0];

  if (directDeps[realName]) {
    console.log(`⏭️  Omitiendo override "${key}" — "${realName}" ya es dependencia directa (${directDeps[realName]}), no se necesita override.`);
    continue;
  }

  // Si no hay conflicto, guardamos el override tal cual (formato simple, sin rango)
  cleanOverrides[realName] = value;
}

pkg.overrides = cleanOverrides;

if (pkg.pnpm && pkg.pnpm.overrides) {
  delete pkg.pnpm.overrides;
  if (Object.keys(pkg.pnpm).length === 0) delete pkg.pnpm;
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("✅ overrides limpiados y sin conflicto con dependencias directas.");
EOF

echo ""
echo "📦 Regenerando pnpm-lock.yaml..."
pnpm install --no-frozen-lockfile

echo ""
echo "🔍 Resultado final del campo overrides:"
node -e "console.log(JSON.stringify(require('./package.json').overrides || {}, null, 2))"

echo ""
echo "✅ Listo. Corré 'pnpm build' local para confirmar antes de commitear."