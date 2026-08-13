#!/bin/bash
set -euo pipefail

FILE="app/calendario/page.tsx"

echo "🔧 Corrigiendo toLocalDate() para soportar ISO completo del endpoint /calendar..."

if [ ! -f "$FILE" ]; then
  echo "❌ No se encontró $FILE. Ejecutá este script desde la raíz de coworking-nodo-front."
  exit 1
fi

cp "$FILE" "$FILE.bak"

node <<'EOF'
const fs = require("fs");
const path = "app/calendario/page.tsx";
let content = fs.readFileSync(path, "utf8");

const oldFn = `function toLocalDate(iso: string) {
  // evita off-by-one por timezone al parsear "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}`;

const newFn = `function toLocalDate(iso: string) {
  // evita off-by-one por timezone; soporta "YYYY-MM-DD" e ISO completo "YYYY-MM-DDTHH:mm:ss.sssZ"
  const datePart = iso.split("T")[0]
  const [y, m, d] = datePart.split("-").map(Number)
  return new Date(y, m - 1, d)
}`;

if (!content.includes(oldFn)) {
  console.error("⚠️  No se encontró el bloque exacto de toLocalDate. Revisar manualmente.");
  process.exit(1);
}

content = content.replace(oldFn, newFn);
fs.writeFileSync(path, content);
console.log("✅ toLocalDate() corregida.");
EOF

echo ""
echo "🔍 Revisá el diff antes de commitear:"
diff "$FILE.bak" "$FILE" || true

echo ""
echo "✅ Listo. Corré 'pnpm build' para confirmar antes de subir."