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
