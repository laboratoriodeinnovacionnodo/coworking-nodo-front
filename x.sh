#!/usr/bin/env bash
# ============================================================================
#  v11-auto-bloqueo-por-evento.sh  — coworking-front
#
#  Feature: auto-bloqueo de áreas por evento del calendario en curso
#
#  Lógica:
#    · Polling cada 60s consulta /calendar del calendario-back
#    · Si hay un evento con área COWORKING activo AHORA (fecha+hora Argentina)
#      y estado != CANCELADO/FINALIZADO → bloquea TODAS las áreas automáticamente
#    · Cuando el evento termina → las libera automáticamente
#    · En página principal muestra un banner naranja con el nombre del evento,
#      horario y tipo — igual al estilo del aviso en el modal de agendado
#    · El bloqueo manual del admin (v10) coexiste — si no hay evento activo
#      el admin puede bloquear/desbloquear igual
#
#  Archivos:
#    · hooks/use-evento-activo.ts   (nuevo) — detección del evento en curso
#    · app/page.tsx                          — integra hook + banner + auto-bloqueo
#
#  Sin cambios de schema. Sin cambios en el backend.
#
#  Uso:
#    cd coworking-front
#    chmod +x v11-auto-bloqueo-por-evento.sh
#    ./v11-auto-bloqueo-por-evento.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔧  v11 — Auto-bloqueo por evento del calendario               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# 1. hooks/use-evento-activo.ts — detecta evento en curso (polling)
# ════════════════════════════════════════════════════════════════════════════
echo "📄  hooks/use-evento-activo.ts..."
cat > hooks/use-evento-activo.ts << 'EOF'
"use client"

/**
 * hooks/use-evento-activo.ts
 *
 * Detecta si hay un evento del calendario-back activo AHORA MISMO
 * en el área COWORKING (horario Argentina UTC-3).
 *
 * Hace polling cada INTERVALO_MS ms.
 * Retorna el evento activo o null.
 */

import { useState, useEffect, useRef, useCallback } from "react"

const EVENTOS_BASE = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? ""
const INTERVALO_MS = 60_000 // 1 minuto
const ESTADOS_INACTIVOS = new Set(["CANCELADO", "FINALIZADO"])

export interface EventoActivo {
  id:         string
  titulo:     string
  fechaDesde: string
  fechaHasta: string
  horaDesde:  string
  horaHasta:  string
  tipoEvento: string
  areas?:     string[]
  organizadorSolicitante?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** Hora y fecha actuales en Argentina (UTC-3), sin mutabilidad */
function ahoraArgentina(): { fecha: string; minutos: number } {
  const now      = new Date()
  const ar       = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const fecha    = ar.toISOString().split("T")[0]          // "YYYY-MM-DD"
  const minutos  = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  return { fecha, minutos }
}

/**
 * Dado un evento, determina si está activo en este instante.
 * Para eventos multi-día usa lógica de rango completo.
 */
function estaActivoAhora(ev: EventoActivo): boolean {
  if (ESTADOS_INACTIVOS.has(ev.tipoEvento)) return false
  if (!Array.isArray(ev.areas) || !ev.areas.includes("COWORKING")) return false

  const { fecha, minutos } = ahoraArgentina()
  const evDesde = ev.fechaDesde.split("T")[0]
  const evHasta = ev.fechaHasta.split("T")[0]

  // La fecha actual debe estar dentro del rango del evento
  if (fecha < evDesde || fecha > evHasta) return false

  const inicioMin = timeToMinutes(ev.horaDesde)
  const finMin    = timeToMinutes(ev.horaHasta)

  if (evDesde === evHasta) {
    // Mismo día: verificar rango horario exacto
    return minutos >= inicioMin && minutos < finMin
  }

  // Multi-día
  if (fecha === evDesde) return minutos >= inicioMin   // primer día: desde la hora de inicio
  if (fecha === evHasta) return minutos < finMin        // último día: hasta la hora de fin
  return true                                           // días intermedios: todo el día
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEventoActivo() {
  const [eventoActivo, setEventoActivo] = useState<EventoActivo | null>(null)
  const [cargando,     setCargando]     = useState(true)
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  const verificar = useCallback(async () => {
    if (!EVENTOS_BASE) { setCargando(false); return }

    try {
      const { fecha } = ahoraArgentina()
      const [y, m]    = fecha.split("-").map(Number)

      // Consultar mes actual (y el siguiente si estamos en los últimos días del mes)
      const meses: { y: number; m: number }[] = [{ y, m }]
      const diasEnMes = new Date(y, m, 0).getDate()
      const diaActual = Number(fecha.split("-")[2])
      if (diasEnMes - diaActual <= 3) {
        meses.push(m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 })
      }

      const resultados = await Promise.all(
        meses.map(({ y, m }) =>
          fetch(`${EVENTOS_BASE}/calendar?year=${y}&month=${m}`, { cache: "no-store" })
            .then((r) => r.ok ? r.json() : { events: [] })
            .then((d) => (d.events ?? []) as EventoActivo[])
            .catch(() => [] as EventoActivo[])
        )
      )

      const todos = resultados.flat()
      const activo = todos.find(estaActivoAhora) ?? null
      setEventoActivo(activo)
    } catch {
      // silencioso — no romper la UI si el calendario-back falla
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    verificar()
    intervalRef.current = setInterval(verificar, INTERVALO_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [verificar])

  return { eventoActivo, cargando }
}
EOF
echo "✅  hooks/use-evento-activo.ts"

# ════════════════════════════════════════════════════════════════════════════
# 2. components/evento-activo-banner.tsx — banner visible en página principal
# ════════════════════════════════════════════════════════════════════════════
echo "📄  components/evento-activo-banner.tsx..."
cat > components/evento-activo-banner.tsx << 'EOF'
"use client"

import type { EventoActivo } from "@/hooks/use-evento-activo"
import { CalendarDays, Clock, Users, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const TIPO_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  EN_CURSO:   "En curso",
  FINALIZADO: "Finalizado",
  CANCELADO:  "Cancelado",
  MASIVO:     "Masivo",
  ESCOLAR:    "Escolar",
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  })
}

interface EventoActivoBannerProps {
  evento: EventoActivo
}

export function EventoActivoBanner({ evento }: EventoActivoBannerProps) {
  const mismaFecha = evento.fechaDesde.split("T")[0] === evento.fechaHasta.split("T")[0]

  return (
    <div
      className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3"
      role="alert"
    >
      {/* Ícono */}
      <div className="flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-orange-900">
            Coworking no disponible — evento en curso
          </p>
          <Badge
            variant="outline"
            className="text-[10px] border-orange-300 text-orange-700 bg-orange-100 px-1.5 py-0"
          >
            {TIPO_LABEL[evento.tipoEvento] ?? evento.tipoEvento}
          </Badge>
        </div>

        <p className="text-sm font-medium text-orange-800 truncate">
          {evento.titulo}
        </p>

        <div className="flex items-center gap-3 flex-wrap text-xs text-orange-700">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {mismaFecha
              ? formatFecha(evento.fechaDesde)
              : `${formatFecha(evento.fechaDesde)} → ${formatFecha(evento.fechaHasta)}`
            }
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {evento.horaDesde} – {evento.horaHasta}
          </span>
          {evento.organizadorSolicitante && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {evento.organizadorSolicitante}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
EOF
echo "✅  components/evento-activo-banner.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 3. app/page.tsx — integra hook + banner + auto-bloqueo
# ════════════════════════════════════════════════════════════════════════════
echo "📄  app/page.tsx..."
cat > app/page.tsx << 'EOF'
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter }           from "next/navigation"
import { useAuth }             from "@/contexts/auth-context"
import { useSeats }            from "@/hooks/use-seats"
import { useEventoActivo }     from "@/hooks/use-evento-activo"
import { SeatGrid }            from "@/components/seat-grid"
import { SeatLegend }          from "@/components/seat-legend"
import { AdminPanel }          from "@/components/admin-panel"
import { AgendarModal }        from "@/components/agendar-modal"
import { MapaModal }           from "@/components/mapa-modal"
import { DisponibilidadInline} from "@/components/disponibilidad-inline"
import { CalendarioCoworking } from "@/components/calendario-coworking"
import { EventoActivoBanner }  from "@/components/evento-activo-banner"
import { Button }              from "@/components/ui/button"
import { Switch }              from "@/components/ui/switch"
import { Label }               from "@/components/ui/label"
import { cn }                  from "@/lib/utils"
import { useToast }            from "@/hooks/use-toast"
import {
  Loader2, RefreshCw, LogOut, Menu,
  Armchair, CalendarPlus, CalendarRange, MapPin, Map, LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// ── Vistas ───────────────────────────────────────────────────────────────────
type Vista = "disponibilidad" | "asientos" | "mapa" | "agendar" | "calendario"

const VISTAS: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: "disponibilidad", label: "Disponibilidad", icon: MapPin        },
  { id: "asientos",       label: "Asientos",       icon: LayoutGrid    },
  { id: "mapa",           label: "Mapa",           icon: Map           },
  { id: "agendar",        label: "Agendar",        icon: CalendarPlus  },
  { id: "calendario",     label: "Calendario",     icon: CalendarRange },
]

export default function CoworkingSeatsPage() {
  const router                = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll }   = useSeats()
  const { eventoActivo }      = useEventoActivo()
  const { toast }             = useToast()

  const [isAdminMode,    setIsAdminMode]    = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [vista,          setVista]          = useState<Vista>("asientos")
  const [mapaOpen,       setMapaOpen]       = useState(false)
  const [agendarOpen,    setAgendarOpen]    = useState(false)

  // Ref para rastrear el estado de bloqueo previo por evento
  // y disparar bloqueo/liberación solo cuando cambia
  const bloqueadoPorEventoRef = useRef<string | null>(null)

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSeats()
  }, [fetchSeats])

  // ── Auto-bloqueo / auto-liberación por evento del calendario ──────────────
  useEffect(() => {
    const eventoId = eventoActivo?.id ?? null

    // No hacer nada si no cambió el estado del evento
    if (eventoId === bloqueadoPorEventoRef.current) return

    if (eventoId !== null && bloqueadoPorEventoRef.current === null) {
      // Nuevo evento detectado → bloquear
      bloqueadoPorEventoRef.current = eventoId
      toggleBlockAll(true).catch(() => {})
    } else if (eventoId === null && bloqueadoPorEventoRef.current !== null) {
      // Evento terminó → liberar
      bloqueadoPorEventoRef.current = null
      toggleBlockAll(false).catch(() => {})
    } else if (eventoId !== null && bloqueadoPorEventoRef.current !== null && eventoId !== bloqueadoPorEventoRef.current) {
      // Cambió de evento (caso raro, pero posible) → solo actualizar ref
      bloqueadoPorEventoRef.current = eventoId
    }
  }, [eventoActivo, toggleBlockAll])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleBlock = async (block: boolean) => {
    await toggleBlockAll(block)
  }

  const handleRefresh = async () => {
    await fetchSeats()
    toast({ title: "Datos actualizados", description: "Se recargaron los datos desde el backend" })
  }

  const handleVista = (v: Vista) => {
    if (v === "mapa")    { setMapaOpen(true);   return }
    if (v === "agendar") { setAgendarOpen(true); return }
    setVista(v)
  }

  // isBlocked: hay evento activo O todas las áreas están OCUPADO
  const bloqueadoPorEvento = eventoActivo !== null
  const bloqueadoManual    = !bloqueadoPorEvento && seats.length > 0 && seats.every((s) => s.status === "occupied")
  const isBlocked          = bloqueadoPorEvento || bloqueadoManual

  const occupiedCount  = seats.filter((s) => s.status === "occupied").length
  const availableCount = seats.filter((s) => s.status === "available").length

  // ── Renders de carga / guard ──────────────────────────────────────────────
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
        <div className="max-w-2xl mx-auto px-4 py-3">

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
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => { handleRefresh(); setMobileMenuOpen(false) }}
                    >
                      <RefreshCw className="w-4 h-4" /> Actualizar
                    </Button>
                    {isAdmin && (
                      <div className="flex items-center gap-2 py-1">
                        <Switch
                          id="admin-mode-mobile"
                          checked={isAdminMode}
                          onCheckedChange={setIsAdminMode}
                        />
                        <Label htmlFor="admin-mode-mobile" className="cursor-pointer">Modo Admin</Label>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={logout}
                    >
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
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Banner de evento activo — siempre visible si hay evento */}
        {eventoActivo && (
          <EventoActivoBanner evento={eventoActivo} />
        )}

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

        {/* Admin panel — solo si es admin Y no hay evento automático */}
        {isAdminMode && isAdmin && !bloqueadoPorEvento && (
          <AdminPanel
            isBlocked={bloqueadoManual}
            onToggleBlock={handleToggleBlock}
          />
        )}

        {/* Admin panel deshabilitado cuando hay evento — informativo */}
        {isAdminMode && isAdmin && bloqueadoPorEvento && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
            El panel de administración está deshabilitado mientras haya un evento activo en el calendario.
            Las áreas se liberarán automáticamente cuando el evento termine.
          </div>
        )}

        {/* ══ Card principal con tabs ═══════════════════════════════ */}
        <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">

          {/* Barra de vistas */}
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

          {/* Contenido activo */}
          <div className="p-4 md:p-6">

            {vista === "disponibilidad" && (
              <DisponibilidadInline onSuccess={fetchSeats} />
            )}

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
                  <SeatGrid
                    seats={seats}
                    isBlocked={isBlocked && !isAdminMode}
                  />
                </div>
              </div>
            )}

            {vista === "calendario" && (
              <CalendarioCoworking />
            )}

          </div>
        </div>

      </div>

      {/* ══ Modales ══════════════════════════════════════════════════ */}
      <MapaModal    open={mapaOpen}    onOpenChange={setMapaOpen} />
      <AgendarModal open={agendarOpen} onOpenChange={setAgendarOpen} onSuccess={fetchSeats} />

    </div>
  )
}
EOF
echo "✅  app/page.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 4. Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v11-auto-bloqueo-por-evento.sh completado                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Archivos nuevos/modificados:"
echo "    · hooks/use-evento-activo.ts      → polling 60s, detecta evento"
echo "                                        activo ahora en Argentina (UTC-3)"
echo "    · components/evento-activo-banner → banner naranja con nombre,"
echo "                                        horario, tipo y organizador"
echo "    · app/page.tsx                    → integra todo + auto-bloqueo"
echo ""
echo "  Comportamiento:"
echo "    · Evento activo ahora → bloquea áreas + muestra banner"
echo "    · Evento termina      → libera áreas automáticamente"
echo "    · Panel admin deshabilitado mientras haya evento activo"
echo "    · Admin puede bloquear/desbloquear manual si NO hay evento"
echo "    · El bloqueo por evento NO pisa reservas activas (backend)"
echo "    · CANCELADO y FINALIZADO no bloquean"
echo ""
echo "  Sin cambios de schema. Sin cambios en el backend."
echo ""