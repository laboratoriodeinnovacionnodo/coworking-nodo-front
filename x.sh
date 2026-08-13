#!/bin/bash
set -euo pipefail

FILE="app/calendario/page.tsx"

echo "🔧 Corrigiendo endpoint de eventos en $FILE..."

if [ ! -f "$FILE" ]; then
  echo "❌ No se encontró $FILE. Ejecutá este script desde la raíz de coworking-nodo-front."
  exit 1
fi

cp "$FILE" "$FILE.bak"

# Reemplazar la URL del fetch
sed -i \
  -e "s|\`\${EVENTOS_API}/events/public?fechaDesde=\${desde}&fechaHasta=\${hasta}\`|\`\${EVENTOS_API}/calendar?year=\${anio}\&month=\${mes + 1}\`|" \
  "$FILE"

# Reemplazar el parseo de la respuesta y el filtro de estado
python3 -c "" 2>/dev/null || true  # noop, aseguramos que no usamos python

node <<'EOF'
const fs = require("fs");
const path = "app/calendario/page.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `const data: Evento[] = await res.json()\n      setEventos(data.filter((e) => e.estado === "APROBADO"))`,
  `const data = await res.json()\n      setEventos((data.events ?? []).filter((e: Evento) => e.tipoEvento !== "CANCELADO"))`
);

fs.writeFileSync(path, content);
console.log("✅ Parseo de respuesta y filtro actualizados.");
EOF

echo ""
echo "🔍 Revisá el diff antes de commitear:"
diff "$FILE.bak" "$FILE" || true

echo ""
echo "✅ Listo. Corré 'pnpm dev' o 'pnpm build' para confirmar antes de subir."