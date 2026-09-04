#!/usr/bin/env bash
# ============================================================================
#  v21-ui-asientos-modal.sh  — coworking-front
#
#  Cambio: "Asientos / Mapa" pasa a ser un modal grande (como era Mapa).
#  "Disponibilidad" queda como único tab de contenido, siempre visible.
#
#  Tabs finales:
#    · Disponibilidad  → contenido inline (default, fijo)
#    · Asientos / Mapa → abre modal con SeatGrid + Plano side by side
#    · Agendar         → abre modal de agendado (sin cambios)
#
#  Sin cambios de lógica ni de backend.
#
#  Uso:
#    cd coworking-front
#    chmod +x v21-ui-asientos-modal.sh
#    ./v21-ui-asientos-modal.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🎨  v21 — Asientos/Mapa como modal, Disponibilidad fijo        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# 1. components/asientos-mapa-modal.tsx — nuevo modal
# ════════════════════════════════════════════════════════════════════════════
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
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                  className="max-w-full max-h-[400px] object-contain"
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

# ════════════════════════════════════════════════════════════════════════════
# 2. app/page.tsx — solo Disponibilidad como tab fijo, resto modales
# ════════════════════════════════════════════════════════════════════════════
echo "📄  app/page.tsx..."
cat > app/page.tsx << 'EOF'
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter }             from "next/navigation"
import { useAuth }               from "@/contexts/auth-context"
import { useSeats }              from "@/hooks/use-seats"
import { useEventoActivo }       from "@/hooks/use-evento-activo"
import { AdminPanel }            from "@/components/admin-panel"
import { AgendarModal }          from "@/components/agendar-modal"
import { AsientosMapaModal }     from "@/components/asientos-mapa-modal"
import { DisponibilidadInline }  from "@/components/disponibilidad-inline"
import { CalendarioCoworking }   from "@/components/calendario-coworking"
import { EventoActivoBanner }    from "@/components/evento-activo-banner"
import { Button }                from "@/components/ui/button"
import { Switch }                from "@/components/ui/switch"
import { Label }                 from "@/components/ui/label"
import { cn }                    from "@/lib/utils"
import { useToast }              from "@/hooks/use-toast"
import {
  Loader2, RefreshCw, LogOut, Menu,
  Armchair, CalendarPlus, MapPin, LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// ── Solo un tab de contenido; el resto son botones que abren modales ──────────
type Accion = "disponibilidad" | "asientos" | "agendar"

const ACCIONES: { id: Accion; label: string; icon: React.ElementType; esModal: boolean }[] = [
  { id: "disponibilidad", label: "Disponibilidad",  icon: MapPin,       esModal: false },
  { id: "asientos",       label: "Asientos / Mapa", icon: LayoutGrid,   esModal: true  },
  { id: "agendar",        label: "Agendar",         icon: CalendarPlus, esModal: true  },
]

const POLLING_MS = 30_000

export default function CoworkingSeatsPage() {
  const router  = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll }   = useSeats()
  const { eventoActivo }       = useEventoActivo()
  const { toast }              = useToast()

  const [isAdminMode,    setIsAdminMode]    = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [asientosOpen,   setAsientosOpen]   = useState(false)
  const [agendarOpen,    setAgendarOpen]    = useState(false)

  const bloqueadoPorEventoRef = useRef<string | null>(null)

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  // ── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => { fetchSeats() }, [fetchSeats])

  // ── Polling 30s ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(fetchSeats, POLLING_MS)
    return () => clearInterval(id)
  }, [fetchSeats])

  // ── Auto-bloqueo por evento ─────────────────────────────────────────────
  useEffect(() => {
    const eventoId = eventoActivo?.id ?? null
    if (eventoId === bloqueadoPorEventoRef.current) return
    if (eventoId !== null && bloqueadoPorEventoRef.current === null) {
      bloqueadoPorEventoRef.current = eventoId
      toggleBlockAll(true).catch(() => {})
    } else if (eventoId === null && bloqueadoPorEventoRef.current !== null) {
      bloqueadoPorEventoRef.current = null
      toggleBlockAll(false).catch(() => {})
    } else if (eventoId !== null && eventoId !== bloqueadoPorEventoRef.current) {
      bloqueadoPorEventoRef.current = eventoId
    }
  }, [eventoActivo, toggleBlockAll])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    await fetchSeats()
    toast({ title: "Datos actualizados" })
  }

  const handleAccion = (a: Accion) => {
    if (a === "asientos") { setAsientosOpen(true); return }
    if (a === "agendar")  { setAgendarOpen(true);  return }
    // "disponibilidad" no hace nada — siempre está visible
  }

  const bloqueadoPorEvento = eventoActivo !== null
  const bloqueadoManual    = !bloqueadoPorEvento && seats.length > 0 && seats.every((s) => s.status === "occupied")
  const isBlocked          = bloqueadoPorEvento || bloqueadoManual
  const occupiedCount      = seats.filter((s) => s.status === "occupied").length
  const availableCount     = seats.filter((s) => s.status === "available").length

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!admin) return null

  if (loading && seats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Cargando áreas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">

      {/* ══ Header ══════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Armchair className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Coworking</h1>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                  <Label htmlFor="admin-mode" className="text-sm cursor-pointer">Admin</Label>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Armchair className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-sm">Coworking</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="space-y-3 pt-4">
                    <div className="pb-3 border-b">
                      <p className="font-semibold">{admin.nombre}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                    <Button variant="outline" className="w-full justify-start gap-2"
                      onClick={() => { handleRefresh(); setMobileMenuOpen(false) }}>
                      <RefreshCw className="w-4 h-4" /> Actualizar
                    </Button>
                    {isAdmin && (
                      <div className="flex items-center gap-2 py-1">
                        <Switch id="admin-mode-mobile" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                        <Label htmlFor="admin-mode-mobile" className="cursor-pointer">Modo Admin</Label>
                      </div>
                    )}
                    <Button variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={logout}>
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

        </div>
      </div>

      {/* ══ Contenido ════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4 pb-24">

        {eventoActivo && <EventoActivoBanner evento={eventoActivo} />}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-foreground">{seats.length}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-green-500">{availableCount}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Libres</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-red-500">{occupiedCount}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Ocupados</p>
          </div>
        </div>

        {/* Admin panel */}
        {isAdminMode && isAdmin && !bloqueadoPorEvento && (
          <AdminPanel isBlocked={bloqueadoManual} onToggleBlock={toggleBlockAll} />
        )}
        {isAdminMode && isAdmin && bloqueadoPorEvento && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
            El panel de administración está deshabilitado mientras haya un evento activo.
            Las áreas se liberarán automáticamente cuando el evento termine.
          </div>
        )}

        {/* ══ Card principal ═══════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">

          {/* Barra de acciones */}
          <div className="border-b border-border px-4 pt-4 pb-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {ACCIONES.map(({ id, label, icon: Icon, esModal }) => {
                // "disponibilidad" es el único tab real — siempre activo
                const isActive = !esModal && id === "disponibilidad"
                return (
                  <button
                    key={id}
                    onClick={() => handleAccion(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      esModal ? "hover:text-primary" : "",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenido: siempre Disponibilidad + Calendario */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 items-start">
              <div className="min-w-0">
                <DisponibilidadInline onSuccess={fetchSeats} />
              </div>
              <div className="min-w-0 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
                <CalendarioCoworking />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ══ Modales ══════════════════════════════════════════════════ */}
      <AsientosMapaModal
        open={asientosOpen}
        onOpenChange={setAsientosOpen}
        seats={seats}
        isBlocked={isBlocked && !isAdminMode}
        eventoTitulo={eventoActivo?.titulo}
      />
      <AgendarModal
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
        onSuccess={fetchSeats}
      />

    </div>
  )
}
EOF
echo "✅  app/page.tsx"

# ════════════════════════════════════════════════════════════════════════════
# Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v21-ui-asientos-modal.sh completado                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Barra de acciones:"
echo "    · Disponibilidad  → tab fijo, siempre visible (subrayado activo)"
echo "    · Asientos / Mapa → abre modal max-w-5xl con grid 2 cols"
echo "    · Agendar         → abre modal de agendado (sin cambios)"
echo ""
echo "  Contenido fijo: Disponibilidad + Calendario side by side"
echo ""
echo "  Sin cambios de lógica ni de backend."
echo ""