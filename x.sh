#!/usr/bin/env bash
# =============================================================================
# v4-calendario-coworking-ui.sh — v1.0.0 — PRODUCCIÓN
# Rediseño visual completo de CalendarioCoworking:
#  · Cards por evento (no tabla compacta)
#  · Filtro desde hoy en adelante
#  · Paginado de 5 eventos por página
#  · Navegación mes a mes conservada
# =============================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  v4-calendario-coworking-ui.sh — v1.0.0                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré el script desde la raíz del proyecto Next.js"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# 1. components/calendario-coworking.tsx — rediseño completo
# ════════════════════════════════════════════════════════════════════════════
echo "📄  Reescribiendo components/calendario-coworking.tsx..."
cat > components/calendario-coworking.tsx << 'EOF'
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import {
  Loader2,
  RefreshCw,
  Inbox,
  CalendarDays,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Tipos ─────────────────────────────────────────────────────────────────────

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
  informacion?:            string
  fechaDesde:              string
  fechaHasta:              string
  horaDesde:               string
  horaHasta:               string
  tipoEvento:              TipoEvento
  areas?:                  string[]
  organizadorSolicitante?: string
  convocatoria?:           number
}

interface CalendarResponse {
  events:      Evento[]
  totalEvents: number
}

// ── Constantes ────────────────────────────────────────────────────────────────

const POR_PAGINA = 5

const EVENTOS_API =
  process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? "https://localhost:3000/api"

const TIPO_LABELS: Record<TipoEvento, string> = {
  PENDIENTE:  "Pendiente",
  EN_CURSO:   "En curso",
  FINALIZADO: "Finalizado",
  CANCELADO:  "Cancelado",
  MASIVO:     "Masivo",
  ESCOLAR:    "Escolar",
}

const TIPO_STYLES: Record<TipoEvento, string> = {
  PENDIENTE:  "bg-amber-50  text-amber-700  border-amber-200  ring-amber-100",
  EN_CURSO:   "bg-blue-50   text-blue-700   border-blue-200   ring-blue-100",
  FINALIZADO: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100",
  CANCELADO:  "bg-red-50    text-red-700    border-red-200    ring-red-100",
  MASIVO:     "bg-purple-50 text-purple-700 border-purple-200 ring-purple-100",
  ESCOLAR:    "bg-pink-50   text-pink-700   border-pink-200   ring-pink-100",
}

const TIPO_DOT: Record<TipoEvento, string> = {
  PENDIENTE:  "bg-amber-400",
  EN_CURSO:   "bg-blue-500",
  FINALIZADO: "bg-emerald-500",
  CANCELADO:  "bg-red-500",
  MASIVO:     "bg-purple-500",
  ESCOLAR:    "bg-pink-500",
}

const TIPO_BORDER: Record<TipoEvento, string> = {
  PENDIENTE:  "border-l-amber-400",
  EN_CURSO:   "border-l-blue-500",
  FINALIZADO: "border-l-emerald-500",
  CANCELADO:  "border-l-red-500",
  MASIVO:     "border-l-purple-500",
  ESCOLAR:    "border-l-pink-500",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mesLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year:  "numeric",
  })
}

function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  })
}

function esHoyOFuturo(iso: string): boolean {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d) >= hoy
}

function esHoy(iso: string): boolean {
  const hoy = new Date()
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  const fecha = new Date(y, m - 1, d)
  return (
    fecha.getDate()     === hoy.getDate()     &&
    fecha.getMonth()    === hoy.getMonth()    &&
    fecha.getFullYear() === hoy.getFullYear()
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CalendarioCoworking() {
  const now = new Date()
  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [todos,   setTodos]   = useState<Evento[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [pagina,  setPagina]  = useState(1)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEventos = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPagina(1)
    try {
      const url = `${EVENTOS_API}/calendar?year=${year}&month=${month}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: CalendarResponse = await res.json()

      // Filtrar COWORKING + desde hoy en adelante (por fechaHasta para incluir eventos que terminan hoy)
      const filtrados = (data.events ?? []).filter(
        (e) =>
          Array.isArray(e.areas) &&
          e.areas.includes("COWORKING") &&
          esHoyOFuturo(e.fechaDesde),
      )

      // Ordenar por fecha ascendente
      filtrados.sort((a, b) =>
        a.fechaDesde.localeCompare(b.fechaDesde) ||
        a.horaDesde.localeCompare(b.horaDesde),
      )

      setTodos(filtrados)
    } catch (err) {
      console.error("[CalendarioCoworking]", err)
      setError("No se pudieron cargar los eventos.")
      setTodos([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { void fetchEventos() }, [fetchEventos])

  // ── Navegación mes ─────────────────────────────────────────────────────────
  const prevMes = () => {
    setPagina(1)
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else             { setMonth((m) => m - 1) }
  }
  const nextMes = () => {
    setPagina(1)
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else              { setMonth((m) => m + 1) }
  }

  // ── Paginado ───────────────────────────────────────────────────────────────
  const totalPaginas = Math.ceil(todos.length / POR_PAGINA)
  const eventos      = todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight capitalize">
              {mesLabel(year, month)}
            </h3>
            <p className="text-[10px] text-muted-foreground">Área Coworking · desde hoy</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={prevMes} disabled={loading} aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={nextMes} disabled={loading} aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={fetchEventos} disabled={loading} aria-label="Actualizar"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-sm">Cargando eventos...</p>
        </div>
      )}

      {/* ── Sin eventos ───────────────────────────────────────────── */}
      {!loading && !error && todos.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Inbox className="w-7 h-7 opacity-50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Sin eventos próximos</p>
            <p className="text-xs opacity-60 mt-0.5">No hay eventos de Coworking desde hoy en este mes</p>
          </div>
        </div>
      )}

      {/* ── Cards de eventos ──────────────────────────────────────── */}
      {!loading && eventos.length > 0 && (
        <div className="space-y-3">
          {eventos.map((evento) => {
            const hoy      = esHoy(evento.fechaDesde)
            const multidia = evento.fechaDesde.split("T")[0] !== evento.fechaHasta.split("T")[0]

            return (
              <div
                key={evento.id}
                className={cn(
                  "rounded-xl border border-l-4 bg-white shadow-sm p-4 space-y-3 transition-shadow hover:shadow-md",
                  TIPO_BORDER[evento.tipoEvento],
                  hoy && "ring-1 ring-primary/20",
                )}
              >
                {/* Fila 1: título + badge estado */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", TIPO_DOT[evento.tipoEvento])} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {evento.titulo}
                        {hoy && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Hoy
                          </span>
                        )}
                      </p>
                      {evento.descripcion && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {evento.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={cn(
                    "flex-shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    TIPO_STYLES[evento.tipoEvento],
                  )}>
                    {TIPO_LABELS[evento.tipoEvento]}
                  </span>
                </div>

                {/* Fila 2: fecha, horario, organizador, convocatoria */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {/* Fecha */}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Fecha</p>
                      <p className="text-xs font-medium text-foreground capitalize">
                        {formatFechaLarga(evento.fechaDesde)}
                        {multidia && (
                          <span className="text-muted-foreground font-normal">
                            {" → "}{formatFechaLarga(evento.fechaHasta)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Horario */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Horario</p>
                      <p className="text-xs font-medium text-foreground tabular-nums">
                        {evento.horaDesde} – {evento.horaHasta}
                      </p>
                    </div>
                  </div>

                  {/* Organizador */}
                  {evento.organizadorSolicitante && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Organizador</p>
                        <p className="text-xs text-foreground truncate">{evento.organizadorSolicitante}</p>
                      </div>
                    </div>
                  )}

                  {/* Convocatoria */}
                  {evento.convocatoria != null && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Convocatoria</p>
                        <p className="text-xs font-medium text-foreground tabular-nums">
                          {evento.convocatoria} personas
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Paginado ──────────────────────────────────────────────── */}
      {!loading && totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {((pagina - 1) * POR_PAGINA) + 1}–{Math.min(pagina * POR_PAGINA, todos.length)} de {todos.length} eventos
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {/* Números de página */}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === pagina ? "default" : "outline"}
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() => setPagina(n)}
                aria-label={`Página ${n}`}
              >
                {n}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Footer contador ───────────────────────────────────────── */}
      {!loading && todos.length > 0 && totalPaginas <= 1 && (
        <p className="text-[10px] text-muted-foreground text-right pt-1">
          {todos.length} evento{todos.length !== 1 ? "s" : ""} en Coworking este mes
        </p>
      )}

    </div>
  )
}
EOF
echo "✅  components/calendario-coworking.tsx rediseñado"

# ════════════════════════════════════════════════════════════════════════════
# 2. Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v4-calendario-coworking-ui.sh — v1.0.0 completado          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Mejoras aplicadas:"
echo "  · Cards visuales con border-left de color por estado"
echo "  · Badge 'Hoy' en eventos del día actual"
echo "  · Filtro: solo desde hoy en adelante"
echo "  · Ordenado: fecha y hora ascendente"
echo "  · Paginado: 5 eventos por página con numeración"
echo "  · Grip de datos: fecha larga, horario, organizador, convocatoria"
echo ""