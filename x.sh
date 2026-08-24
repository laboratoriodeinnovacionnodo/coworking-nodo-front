#!/usr/bin/env bash
# =============================================================================
# v3-calendario-coworking.sh — v1.1.0 — PRODUCCIÓN
# Fix: usa /calendar?year=&month= igual que app/calendario/page.tsx
#      y lee data.events (el backend devuelve { events, totalEvents, ... })
# =============================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  v3-calendario-coworking.sh — v1.1.0                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré el script desde la raíz del proyecto Next.js"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# 1. components/calendario-coworking.tsx
#    — mismo endpoint que app/calendario/page.tsx: /calendar?year=&month=
#    — lee data.events (respuesta envuelta en objeto)
#    — filtra areas.includes("COWORKING")
# ════════════════════════════════════════════════════════════════════════════
echo "📄  Creando components/calendario-coworking.tsx..."
cat > components/calendario-coworking.tsx << 'EOF'
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  RefreshCw,
  Inbox,
  CalendarDays,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ── Tipos alineados con calendario-back ──────────────────────────────────────

type TipoEvento =
  | "PENDIENTE"
  | "EN_CURSO"
  | "FINALIZADO"
  | "CANCELADO"
  | "MASIVO"
  | "ESCOLAR"

interface Evento {
  id:                      string
  titulo:                  string
  descripcion?:            string
  fechaDesde:              string
  fechaHasta:              string
  horaDesde:               string
  horaHasta:               string
  tipoEvento:              TipoEvento
  areas?:                  string[]
  organizadorSolicitante?: string
  convocatoria?:           number
}

// Respuesta real del backend: { events: Evento[], totalEvents: number, ... }
interface CalendarResponse {
  events:      Evento[]
  totalEvents: number
}

// ── Constantes visuales ───────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoEvento, string> = {
  PENDIENTE:  "Pendiente",
  EN_CURSO:   "En curso",
  FINALIZADO: "Finalizado",
  CANCELADO:  "Cancelado",
  MASIVO:     "Masivo",
  ESCOLAR:    "Escolar",
}

const TIPO_CLASS: Record<TipoEvento, string> = {
  PENDIENTE:  "bg-amber-100 text-amber-800 border-amber-200",
  EN_CURSO:   "bg-blue-100  text-blue-800  border-blue-200",
  FINALIZADO: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELADO:  "bg-red-100   text-red-800   border-red-200",
  MASIVO:     "bg-purple-100 text-purple-800 border-purple-200",
  ESCOLAR:    "bg-pink-100  text-pink-800  border-pink-200",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mismo valor que usa app/calendario/page.tsx
const EVENTOS_API = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? "https://localhost:3000/api"

function mesLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year:  "numeric",
  })
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-")
  return `${d}/${m}/${y}`
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CalendarioCoworking() {
  const now = new Date()
  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Mismo endpoint y params que app/calendario/page.tsx
      const url = `${EVENTOS_API}/calendar?year=${year}&month=${month}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)

      // El backend devuelve { events: [...], totalEvents: N, ... }
      const data: CalendarResponse = await res.json()
      const todos = data.events ?? []

      // Filtrar solo los que tienen COWORKING en sus áreas
      const filtrados = todos.filter(
        (e) => Array.isArray(e.areas) && e.areas.includes("COWORKING"),
      )

      setEventos(filtrados)
    } catch (err) {
      console.error("[CalendarioCoworking] Error:", err)
      setError("No se pudieron cargar los eventos.")
      setEventos([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { void fetchEventos() }, [fetchEventos])

  const prevMes = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else             { setMonth((m) => m - 1) }
  }
  const nextMes = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else              { setMonth((m) => m + 1) }
  }

  const tieneConvocatoria = eventos.some((e) => e.convocatoria != null)

  return (
    <div className="space-y-4">

      {/* Cabecera con navegación de mes */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold capitalize text-foreground">
            {mesLabel(year, month)}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={prevMes} disabled={loading} aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={nextMes} disabled={loading} aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={fetchEventos} disabled={loading} aria-label="Actualizar"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>

      {/* Área fija */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Área:</span>
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-teal-100 text-teal-800 border-teal-200">
          Coworking
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive text-center py-2">{error}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Sin eventos */}
      {!loading && !error && eventos.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Inbox className="w-8 h-8 opacity-40" />
          <p className="text-sm">Sin eventos en Coworking este mes</p>
        </div>
      )}

      {/* Tabla */}
      {!loading && eventos.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Evento</TableHead>
                <TableHead className="text-xs font-semibold w-[100px]">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Fecha
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold w-[90px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Horario
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold w-[80px]">Estado</TableHead>
                <TableHead className="text-xs font-semibold w-[110px]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Organizador
                  </span>
                </TableHead>
                {tieneConvocatoria && (
                  <TableHead className="text-xs font-semibold w-[55px] text-right">
                    Conv.
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((evento) => (
                <TableRow key={evento.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">
                        {evento.titulo}
                      </p>
                      {evento.descripcion && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {evento.descripcion}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-xs text-foreground">
                      {formatFecha(evento.fechaDesde)}
                      {evento.fechaDesde.split("T")[0] !== evento.fechaHasta.split("T")[0] && (
                        <span className="text-muted-foreground">
                          {" → "}{formatFecha(evento.fechaHasta)}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-xs text-foreground tabular-nums">
                      {evento.horaDesde} – {evento.horaHasta}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TIPO_CLASS[evento.tipoEvento]}`}>
                      {TIPO_LABELS[evento.tipoEvento]}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {evento.organizadorSolicitante ?? "—"}
                    </p>
                  </TableCell>
                  {tieneConvocatoria && (
                    <TableCell className="py-2.5 text-right">
                      {evento.convocatoria != null
                        ? <span className="text-xs font-medium text-foreground tabular-nums">{evento.convocatoria}</span>
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer */}
      {!loading && eventos.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-right">
          {eventos.length} evento{eventos.length !== 1 ? "s" : ""} en Coworking este mes
        </p>
      )}

    </div>
  )
}
EOF
echo "✅  components/calendario-coworking.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 2. app/page.tsx — reescritura completa (idéntico al actual + calendario)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "📄  Reescribiendo app/page.tsx..."
cat > app/page.tsx << 'EOF'
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useSeats } from "@/hooks/use-seats"
import { SeatGrid } from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import { AdminPanel } from "@/components/admin-panel"
import { AgendarModal } from "@/components/agendar-modal"
import { MapaModal } from "@/components/mapa-modal"
import { DisponibilidadInline } from "@/components/disponibilidad-inline"
import { CalendarioCoworking } from "@/components/calendario-coworking"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Loader2,
  RefreshCw,
  LogOut,
  Menu,
  Armchair,
  CalendarPlus,
  CalendarRange,
  MapPin,
  Map,
  LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

// ── Vistas disponibles dentro del card principal ──────────────
type Vista = "disponibilidad" | "asientos" | "mapa" | "agendar" | "calendario"

const VISTAS: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: "disponibilidad", label: "Disponibilidad", icon: MapPin        },
  { id: "asientos",       label: "Asientos",       icon: LayoutGrid    },
  { id: "mapa",           label: "Mapa",           icon: Map           },
  { id: "agendar",        label: "Agendar",        icon: CalendarPlus  },
  { id: "calendario",     label: "Calendario",     icon: CalendarRange },
]

export default function CoworkingSeatsPage() {
  const router = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll } = useSeats()
  const { toast } = useToast()

  const [isAdminMode,    setIsAdminMode]    = useState(false)
  const [isBlocked,      setIsBlocked]      = useState(false)
  const [eventName,      setEventName]      = useState<string>()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [vista,          setVista]          = useState<Vista>("asientos")
  const [mapaOpen,       setMapaOpen]       = useState(false)
  const [agendarOpen,    setAgendarOpen]    = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  const handleToggleBlock = async (block: boolean, newEventName?: string) => {
    setIsBlocked(block)
    setEventName(newEventName)
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

  const occupiedCount  = seats.filter((s) => s.status === "occupied").length
  const availableCount = seats.filter((s) => s.status === "available").length

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

      {/* ══ Header ════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Armchair className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Gestión de Espacios</h1>
                <p className="text-xs text-muted-foreground">{admin.nombre} · {admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
                <LogOut className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1">
                  <Switch
                    id="admin-mode"
                    checked={isAdminMode}
                    onCheckedChange={setIsAdminMode}
                    className="scale-90"
                  />
                  <Label htmlFor="admin-mode" className="text-xs cursor-pointer">Admin</Label>
                </div>
              )}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <Armchair className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Gestión de Espacios</h1>
                <p className="text-[10px] text-muted-foreground">{admin.nombre}</p>
              </div>
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
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

      {/* ══ Contenido ══════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

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
        {isAdminMode && isAdmin && (
          <AdminPanel
            isBlocked={isBlocked}
            eventName={eventName}
            onToggleBlock={handleToggleBlock}
          />
        )}

        {/* ══ Card principal con tabs ═══════════════════════════ */}
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
                      Bloqueado · {eventName}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <SeatGrid seats={seats} isBlocked={isBlocked && !isAdminMode} />
                </div>
              </div>
            )}

            {vista === "calendario" && (
              <CalendarioCoworking />
            )}

          </div>
        </div>

      </div>

      {/* ══ Modales ════════════════════════════════════════════════ */}
      <MapaModal open={mapaOpen} onOpenChange={setMapaOpen} />
      <AgendarModal open={agendarOpen} onOpenChange={setAgendarOpen} onSuccess={fetchSeats} />

    </div>
  )
}
EOF
echo "✅  app/page.tsx reescrito"

# ════════════════════════════════════════════════════════════════════════════
# 3. shadcn table
# ════════════════════════════════════════════════════════════════════════════
echo ""
if [ ! -f "components/ui/table.tsx" ]; then
  echo "📦  Instalando shadcn table..."
  pnpm dlx shadcn@latest add table --yes
else
  echo "✅  components/ui/table.tsx ya existe"
fi

# ════════════════════════════════════════════════════════════════════════════
# 4. Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v3-calendario-coworking.sh — v1.1.0 completado             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Fix aplicado:"
echo "  · Endpoint: /calendar?year=&month= (igual que app/calendario)"
echo "  · Respuesta: lee data.events (objeto envuelto, no array directo)"
echo "  · Filtro:    areas.includes('COWORKING')"
echo ""