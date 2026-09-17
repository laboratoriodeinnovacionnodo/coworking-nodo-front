#!/usr/bin/env bash
# ============================================================================
#  v29-coworking-front-seat-estilo.sh  — coworking-front
#  Aplica la misma estética de ciudadano-front a las cards de asientos:
#  card blanca + punto de color + número + badge suave de estado.
#
#  Toca:
#    lib/seat-utils.ts         → colores separados: punto y badge suave
#    components/seat-grid.tsx  → rediseño de card al estilo ciudadano
#    components/seat-legend.tsx → leyenda con puntos suaves
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${RESET}"; }
fail() { echo -e "${RED}❌  $*${RESET}"; exit 1; }

[[ -f "package.json" && -d "app" ]] || fail "Corré desde la raíz de coworking-front"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  v29 · coworking-front · estética cards al estilo ciudadano"
echo "════════════════════════════════════════════════════════════"
echo ""

# ── lib/seat-utils.ts ─────────────────────────────────────────────────────
echo "📄  lib/seat-utils.ts"
cat > lib/seat-utils.ts << 'TSEOF'
import type { SeatStatus } from "@/types/seat"

/** Color del punto de estado (pequeño, sólido) */
export const seatStatusDot: Record<SeatStatus, string> = {
  available:      "bg-green-500",
  occupied:       "bg-red-400",
}

/** Clases del badge de estado (fondo suave + texto de color) */
export const seatStatusBadge: Record<SeatStatus, string> = {
  available:      "bg-green-100 text-green-700",
  occupied:       "bg-red-100   text-red-600",
}

/** Texto legible del estado */
export const seatStatusLabel: Record<SeatStatus, string> = {
  available: "Libre",
  occupied:  "Ocupado",
}

/**
 * Mantener por compatibilidad con cualquier componente que aún use
 * seatStatusColors (devuelve los colores suaves del badge).
 */
export const seatStatusColors: Record<SeatStatus, string> = seatStatusBadge
TSEOF
ok "lib/seat-utils.ts"

# ── components/seat-grid.tsx ──────────────────────────────────────────────
echo "📄  components/seat-grid.tsx"
cat > components/seat-grid.tsx << 'TSEOF'
"use client"

import type { Seat } from "@/types/seat"
import { seatStatusDot, seatStatusBadge, seatStatusLabel } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"

interface SeatGridProps {
  seats:      Seat[]
  isBlocked?: boolean
}

export function SeatGrid({ seats, isBlocked }: SeatGridProps) {
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = []
      acc[seat.row].push(seat)
      return acc
    },
    {} as Record<string, Seat[]>,
  )

  const rows = Object.keys(seatsByRow).sort()

  return (
    <div className="space-y-3 md:space-y-4">
      {rows.map((row) => (
        <div key={row} className="flex items-start gap-2 md:gap-3">
          {/* Letra de fila */}
          <div className="w-6 md:w-8 text-xs md:text-sm font-medium text-muted-foreground pt-3 flex-shrink-0">
            {row}
          </div>

          {/* Cards de asientos */}
          <div className="flex gap-2 md:gap-3 flex-wrap flex-1">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <div
                  key={seat.id}
                  title={`${seat.id} — ${seatStatusLabel[seat.status]}`}
                  className={cn(
                    "bg-white border border-gray-100 rounded-2xl shadow-sm",
                    "flex flex-col items-center gap-1.5 px-2 py-2.5",
                    "w-12 md:w-14 transition-shadow hover:shadow-md",
                    isBlocked && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {/* Punto de color */}
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      seatStatusDot[seat.status],
                    )}
                  />
                  {/* Número */}
                  <span className="text-xs font-bold text-gray-800 leading-none">
                    {seat.number}
                  </span>
                  {/* Badge suave */}
                  <span
                    className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none",
                      seatStatusBadge[seat.status],
                    )}
                  >
                    {seatStatusLabel[seat.status]}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
TSEOF
ok "components/seat-grid.tsx"

# ── components/seat-legend.tsx ────────────────────────────────────────────
echo "📄  components/seat-legend.tsx"
cat > components/seat-legend.tsx << 'TSEOF'
"use client"

import { seatStatusDot, seatStatusLabel } from "@/lib/seat-utils"
import type { SeatStatus } from "@/types/seat"
import { cn } from "@/lib/utils"

const ESTADOS: SeatStatus[] = ["available", "occupied"]

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {ESTADOS.map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", seatStatusDot[status])} />
          <span className="text-muted-foreground">{seatStatusLabel[status]}</span>
        </div>
      ))}
    </div>
  )
}
TSEOF
ok "components/seat-legend.tsx"

# ── TypeScript check ──────────────────────────────────────────────────────
echo ""
echo "🔨  TypeScript check..."
pnpm exec tsc --noEmit --skipLibCheck 2>&1 | head -40 || true

# ── Build ─────────────────────────────────────────────────────────────────
echo ""
echo "🔨  Build..."
pnpm build

echo ""
echo -e "\033[0;32m════════════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅  v29 completado\033[0m"
echo -e "\033[0;32m════════════════════════════════════════════════════════════\033[0m"
echo ""
echo "  Archivos tocados:"
echo "    lib/seat-utils.ts          → seatStatusDot + seatStatusBadge suaves"
echo "    components/seat-grid.tsx   → card blanca + punto + número + badge"
echo "    components/seat-legend.tsx → leyenda con puntos suaves"
echo ""