#!/usr/bin/env bash
# ============================================================================
#  v18-ui-disponibilidad-calendario.sh  — coworking-front
#
#  Mejoras de UI (solo visual, sin cambios de lógica):
#    · Contenedor principal max-w-2xl → max-w-4xl (más espacio)
#    · Tab default al entrar: "disponibilidad" (antes "asientos")
#    · Vista "disponibilidad": layout side-by-side en desktop
#      izquierda → DisponibilidadInline (zonas ocupadas)
#      derecha   → CalendarioCoworking (eventos del mes)
#    · Tab "Calendario" eliminado de la barra (integrado en Disponibilidad)
#
#  Sin cambios de lógica ni de backend.
#
#  Uso:
#    cd coworking-front
#    chmod +x v18-ui-disponibilidad-calendario.sh
#    ./v18-ui-disponibilidad-calendario.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🎨  v18 — UI: disponibilidad + calendario lado a lado          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# app/page.tsx
# ════════════════════════════════════════════════════════════════════════════
echo "📄  app/page.tsx..."
cat > app/page.tsx << 'EOF'
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter }            from "next/navigation"
import { useAuth }              from "@/contexts/auth-context"
import { useSeats }             from "@/hooks/use-seats"
import { useEventoActivo }      from "@/hooks/use-evento-activo"
import { SeatGrid }             from "@/components/seat-grid"
import { SeatLegend }           from "@/components/seat-legend"
import { AdminPanel }           from "@/components/admin-panel"
import { AgendarModal }         from "@/components/agendar-modal"
import { MapaModal }            from "@/components/mapa-modal"
import { DisponibilidadInline } from "@/components/disponibilidad-inline"
import { CalendarioCoworking }  from "@/components/calendario-coworking"
import { EventoActivoBanner }   from "@/components/evento-activo-banner"
import { Button }               from "@/components/ui/button"
import { Switch }               from "@/components/ui/switch"
import { Label }                from "@/components/ui/label"
import { cn }                   from "@/lib/utils"
import { useToast }             from "@/hooks/use-toast"
import {
  Loader2, RefreshCw, LogOut, Menu,
  Armchair, CalendarPlus, MapPin, Map, LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// ── Vistas — "calendario" integrado en "disponibilidad" ──────────────────────
type Vista = "disponibilidad" | "asientos" | "mapa" | "agendar"

const VISTAS: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: "disponibilidad", label: "Disponibilidad", icon: MapPin     },
  { id: "asientos",       label: "Asientos",       icon: LayoutGrid },
  { id: "mapa",           label: "Mapa",           icon: Map        },
  { id: "agendar",        label: "Agendar",        icon: CalendarPlus },
]

const POLLING_MS = 30_000

export default function CoworkingSeatsPage() {
  const router  = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll }   = useSeats()
  const { eventoActivo }      = useEventoActivo()
  const { toast }             = useToast()

  const [isAdminMode,    setIsAdminMode]    = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // ✅ Default: "disponibilidad"
  const [vista,          setVista]          = useState<Vista>("disponibilidad")
  const [mapaOpen,       setMapaOpen]       = useState(false)
  const [agendarOpen,    setAgendarOpen]    = useState(false)

  const bloqueadoPorEventoRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  useEffect(() => {
    fetchSeats()
  }, [fetchSeats])

  useEffect(() => {
    const id = setInterval(fetchSeats, POLLING_MS)
    return () => clearInterval(id)
  }, [fetchSeats])

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

  const handleRefresh = async () => {
    await fetchSeats()
    toast({ title: "Datos actualizados" })
  }

  const handleVista = (v: Vista) => {
    if (v === "mapa")    { setMapaOpen(true);   return }
    if (v === "agendar") { setAgendarOpen(true); return }
    setVista(v)
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
        {/* ✅ max-w-4xl para header también */}
        <div className="max-w-4xl mx-auto px-4 py-3">

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

      {/* ══ Contenido — ✅ max-w-4xl ════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 pb-24">

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

          {/* Barra de tabs */}
          <div className="border-b border-border px-4 pt-4 pb-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {VISTAS.map(({ id, label, icon: Icon }) => {
                const isModal  = id === "mapa" || id === "agendar"
                const isActive = !isModal && vista === id
                return (
                  <button
                    key={id}
                    onClick={() => handleVista(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      id === "agendar" && !isActive ? "hover:text-primary" : "",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenido */}
          <div className="p-4 md:p-6">

            {/* ✅ Disponibilidad + Calendario lado a lado */}
            {vista === "disponibilidad" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda: zonas ocupadas */}
                <div className="min-w-0">
                  <DisponibilidadInline onSuccess={fetchSeats} />
                </div>

                {/* Separador vertical solo en desktop */}
                <div className="hidden lg:block w-px bg-border self-stretch" />

                {/* Columna derecha: calendario de eventos */}
                <div className="min-w-0">
                  {/* Label para diferenciar la sección en mobile */}
                  <div className="lg:hidden mb-3 pt-3 border-t border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <span>📅</span> Calendario
                    </h3>
                  </div>
                  <CalendarioCoworking />
                </div>
              </div>
            )}

            {/* Asientos */}
            {vista === "asientos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SeatLegend />
                  {isBlocked && (
                    <span className="text-xs text-destructive font-medium">
                      {bloqueadoPorEvento ? `Evento: ${eventoActivo?.titulo}` : "Bloqueado"}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <SeatGrid seats={seats} isBlocked={isBlocked && !isAdminMode} />
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      <MapaModal    open={mapaOpen}    onOpenChange={setMapaOpen} />
      <AgendarModal open={agendarOpen} onOpenChange={setAgendarOpen} onSuccess={fetchSeats} />

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
echo "║  ✅  v18-ui-disponibilidad-calendario.sh completado             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Cambios UI:"
echo "    · Contenedor: max-w-2xl → max-w-4xl"
echo "    · Tab default al entrar: Disponibilidad (antes Asientos)"
echo "    · Vista Disponibilidad: grid 2 columnas en desktop"
echo "      col-izq → DisponibilidadInline (zonas ocupadas)"
echo "      col-der → CalendarioCoworking (eventos del mes)"
echo "    · Tab Calendario eliminado de la barra (integrado)"
echo "    · En mobile: sección calendario debajo con label"
echo ""
echo "  Sin cambios de lógica ni de backend."
echo ""