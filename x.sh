#!/usr/bin/env bash
# ============================================================================
#  v23-fix-asientos-modal-width.sh  — coworking-front
#
#  Problema: DialogContent de shadcn tiene max-w-lg hardcodeado en
#  components/ui/dialog.tsx que pisa cualquier clase Tailwind que se le pase.
#
#  Fix: sobreescribir con style inline en AsientosMapaModal
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"; exit 1
fi

echo "📄  components/asientos-mapa-modal.tsx..."
cat > components/asientos-mapa-modal.tsx << 'EOF'
"use client"

import type { Seat } from "@/types/seat"
import { SeatGrid }   from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { LayoutGrid } from "lucide-react"

interface AsientosMapaModalProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  seats:         Seat[]
  isBlocked?:    boolean
  eventoTitulo?: string
}

export function AsientosMapaModal({
  open,
  onOpenChange,
  seats,
  isBlocked = false,
  eventoTitulo,
}: AsientosMapaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        shadcn/ui DialogContent tiene max-w-lg hardcodeado en el componente base.
        Se sobreescribe con style inline para evitar que Tailwind lo pise.
      */}
      <DialogContent
        style={{ maxWidth: "min(1400px, 95vw)", width: "100%" }}
        className="max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Asientos / Mapa
          </DialogTitle>
          <DialogDescription>
            Estado actual de los asientos y plano del espacio
          </DialogDescription>
        </DialogHeader>

        {/* Contenido: side by side en desktop, stacked en mobile */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 items-start p-1">

            {/* Columna izquierda: grilla de asientos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SeatLegend />
                {isBlocked && (
                  <span className="text-xs text-destructive font-medium">
                    {eventoTitulo ? `Evento: ${eventoTitulo}` : "Bloqueado"}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <SeatGrid seats={seats} isBlocked={isBlocked} />
              </div>
            </div>

            {/* Columna derecha: plano */}
            <div className="border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Plano del espacio
                </h3>
                <span className="text-[10px] text-muted-foreground/60">Planta 1</span>
              </div>
              <div className="flex items-center justify-center bg-muted/20 rounded-xl p-4 min-h-[240px]">
                <img
                  src="/NODO-PLANO-P1.svg"
                  alt="Plano planta 1 del coworking"
                  className="max-w-full max-h-[460px] object-contain"
                  style={{ transform: "rotate(90deg)" }}
                />
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "✅  components/asientos-mapa-modal.tsx"

echo ""
echo "🔨  Compilando..."
pnpm build

echo "✅  Modal ahora usa min(1400px, 95vw) — no lo pisa shadcn"