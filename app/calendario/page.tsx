"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  MapPin,
  Users,
  FileText,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ── Tipos (alineados con el backend de eventos / calendario-back) ──────────

type EventType =
  | "PENDIENTE"
  | "EN_CURSO"
  | "FINALIZADO"
  | "CANCELADO"
  | "MASIVO"
  | "ESCOLAR"

interface Evento {
  id: string
  titulo: string
  descripcion?: string
  informacion?: string
  fechaDesde: string
  fechaHasta: string
  horaDesde: string
  horaHasta: string
  tipoEvento: EventType
  areas?: string[]
  organizadorSolicitante?: string
  coberturaPrensaBol?: boolean
  convocatoria?: number
  anexos?: string[]
  solicitudes?: string[]
}

// ── Constantes de estilo (mismas que calendario-front) ──────────────────────

const EVENTOS_API = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? "https://localhost:3000/api"

const EVENT_TYPE_COLORS: Record<string, string> = {
  PENDIENTE: "bg-orange-500",
  EN_CURSO: "bg-blue-500",
  FINALIZADO: "bg-green-500",
  CANCELADO: "bg-red-500",
  MASIVO: "bg-purple-500",
  ESCOLAR: "bg-pink-500",
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En Curso",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  MASIVO: "Masivo",
  ESCOLAR: "Escolar",
}

const AREA_LABELS: Record<string, string> = {
  COWORKING: "Coworking (todo)",
  COWORKING_ZONA_A: "Coworking · Zona A",
  COWORKING_ZONA_B: "Coworking · Zona B",
  COWORKING_ZONA_C: "Coworking · Zona C",
  COWORKING_A1: "Coworking · A1",
  COWORKING_A2: "Coworking · A2",
  COWORKING_B1: "Coworking · B1",
  COWORKING_B2: "Coworking · B2",
  COWORKING_B3: "Coworking · B3",
  COWORKING_B4: "Coworking · B4",
  COWORKING_C1: "Coworking · C1",
  COWORKING_C2: "Coworking · C2",
  COWORKING_C3: "Coworking · C3",
  AUDITORIO: "Auditorio",
  LABORATORIO: "Laboratorio",
  AULA_1: "Aula 1",
  AULA_2: "Aula 2",
  AULA_3: "Aula 3",
  AULA_4: "Aula 4",
  AULA_5: "Aula 5",
  AULA_6: "Aula 6",
  RECEPCION_ESTE: "Recepción Este",
  RECEPCION_OESTE: "Recepción Oeste",
  EXPLANADA: "Explanada",
  PLAZA: "Plaza",
  SALA_REUNIONES: "Sala de Reuniones",
}

const AREA_COLORS: Record<string, string> = {
  COWORKING: "bg-teal-500",
  COWORKING_ZONA_A: "bg-orange-400",
  COWORKING_ZONA_B: "bg-rose-500",
  COWORKING_ZONA_C: "bg-slate-700",
  COWORKING_A1: "bg-orange-400",
  COWORKING_A2: "bg-orange-400",
  COWORKING_B1: "bg-rose-500",
  COWORKING_B2: "bg-rose-500",
  COWORKING_B3: "bg-rose-500",
  COWORKING_B4: "bg-rose-500",
  COWORKING_C1: "bg-slate-700",
  COWORKING_C2: "bg-slate-700",
  COWORKING_C3: "bg-slate-700",
  AUDITORIO: "bg-red-400",
  LABORATORIO: "bg-blue-600",
  AULA_1: "bg-yellow-600",
  AULA_2: "bg-yellow-500",
  AULA_3: "bg-amber-600",
  AULA_4: "bg-amber-500",
  AULA_5: "bg-orange-600",
  AULA_6: "bg-orange-500",
  RECEPCION_ESTE: "bg-cyan-500",
  RECEPCION_OESTE: "bg-cyan-600",
  EXPLANADA: "bg-lime-600",
  PLAZA: "bg-lime-500",
  SALA_REUNIONES: "bg-indigo-500",
}

// Pill de estado (igual que calendario-nodo-front)
const STATUS_BADGE: Record<string, string> = {
  PENDIENTE:  "bg-amber-100  text-amber-800  border border-amber-200",
  EN_CURSO:   "bg-blue-100   text-blue-800   border border-blue-200",
  FINALIZADO: "bg-slate-100  text-slate-600  border border-slate-200",
  CANCELADO:  "bg-red-100    text-red-800    border border-red-200",
  MASIVO:     "bg-purple-100 text-purple-800 border border-purple-200",
  ESCOLAR:    "bg-pink-100   text-pink-800   border border-pink-200",
}

const EVENT_PILL_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-50 border-l-[3px] border-amber-500 text-amber-900 hover:bg-amber-100",
  EN_CURSO: "bg-blue-50  border-l-[3px] border-blue-500  text-blue-900  hover:bg-blue-100",
  FINALIZADO: "bg-emerald-50 border-l-[3px] border-emerald-500 text-emerald-900 hover:bg-emerald-100",
  CANCELADO: "bg-red-50   border-l-[3px] border-red-500   text-red-900   hover:bg-red-100",
  MASIVO: "bg-purple-50 border-l-[3px] border-purple-500 text-purple-900 hover:bg-purple-100",
  ESCOLAR: "bg-pink-50  border-l-[3px] border-pink-500  text-pink-900  hover:bg-pink-100",
}

const EVENT_DOT_COLORS: Record<string, string> = {
  PENDIENTE: "bg-amber-500",
  EN_CURSO: "bg-blue-500",
  FINALIZADO: "bg-emerald-500",
  CANCELADO: "bg-red-500",
  MASIVO: "bg-purple-500",
  ESCOLAR: "bg-pink-500",
}

// ── Helpers de fecha ─────────────────────────────────────────────────────────

function parseLocalDate(dateString: string): Date {
  const datePart = dateString.split("T")[0]
  const [year, month, day] = datePart.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateString)
  return date.toLocaleDateString("es-ES", options ?? { day: "2-digit", month: "short", year: "numeric" })
}

// ── Vistas ───────────────────────────────────────────────────────────────────

type ViewMode = "hoy" | "semana" | "mes"

const VIEW_LABELS: Record<ViewMode, string> = { hoy: "Hoy", semana: "Semana", mes: "Mes" }

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const DAY_SHORT   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DAY_SHORT3  = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]

/** Lunes a domingo de la semana que contiene `base`. */
function getWeekRange(base: Date) {
  const d     = new Date(base)
  const dow   = d.getDay()
  const diff  = dow === 0 ? -6 : 1 - dow
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const [events, setEvents] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null)
  const [view, setView] = useState<ViewMode>("hoy") // vista por defecto: Hoy

  const fetchMes = async (year: number, month: number): Promise<Evento[]> => {
    const res = await fetch(`${EVENTOS_API}/calendar?year=${year}&month=${month}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const data = await res.json()
    return data.events ?? []
  }

  const loadEvents = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setLoading(true)
      try {
        if (view === "semana") {
          // La semana puede cruzar dos meses → pedir ambos y deduplicar por id
          const { start, end } = getWeekRange(currentDate)
          const r1 = await fetchMes(start.getFullYear(), start.getMonth() + 1)
          if (start.getMonth() !== end.getMonth()) {
            const r2 = await fetchMes(end.getFullYear(), end.getMonth() + 1)
            setEvents(Array.from(new Map([...r1, ...r2].map((e) => [e.id, e])).values()))
          } else {
            setEvents(r1)
          }
        } else {
          setEvents(await fetchMes(currentDate.getFullYear(), currentDate.getMonth() + 1))
        }
      } catch (err) {
        if (!silencioso) console.error("Error cargando eventos:", err)
      } finally {
        if (!silencioso) setLoading(false)
      }
    },
    [currentDate, view],
  )

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Polling silencioso cada 5 min, igual que el calendario público
  useEffect(() => {
    const intervalo = setInterval(() => loadEvents(true), 5 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [loadEvents])

  const getEventsForDate = (d: Date): Evento[] => {
    const ds = dateStr(d)
    return events
      .filter((e) => ds >= e.fechaDesde.split("T")[0] && ds <= e.fechaHasta.split("T")[0])
      .sort((a, b) => a.horaDesde.localeCompare(b.horaDesde))
  }

  const getEventsForDay = (day: number) =>
    getEventsForDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))

  const getDaysInMonth = (): (number | null)[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i)
    return days
  }

  // ── Navegación ─────────────────────────────────────────────────────────────
  const navigate = (dir: 1 | -1) => {
    setCurrentDate((prev) => {
      // Día 1 al mover de mes para evitar saltos (31 ene + 1 mes → 3 mar)
      if (view === "mes") return new Date(prev.getFullYear(), prev.getMonth() + dir, 1)
      const d = new Date(prev)
      d.setDate(d.getDate() + (view === "semana" ? dir * 7 : dir))
      return d
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setView("hoy")
  }

  const rangeLabel = () => {
    if (view === "mes") return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === "semana") {
      const { start, end } = getWeekRange(currentDate)
      const sm = start.getMonth() !== end.getMonth() ? ` ${MONTH_SHORT[start.getMonth()]}` : ""
      const sy = start.getFullYear() !== end.getFullYear() ? ` ${start.getFullYear()}` : ""
      return `${start.getDate()}${sm}${sy} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`
    }
    return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  const today = new Date()
  const weekDays = (() => {
    const { start } = getWeekRange(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  })()
  const days = getDaysInMonth()
  const presentTypes = [...new Set(events.map((e) => e.tipoEvento))]

  // ── Tarjeta de evento (Hoy y Semana) ───────────────────────────────────────
  const renderEventCard = (event: Evento) => (
    <button
      key={event.id}
      onClick={() => setSelectedEvent(event)}
      className="w-full text-left bg-white border border-border rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", EVENT_DOT_COLORS[event.tipoEvento] ?? "bg-slate-400")} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-snug">{event.titulo}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              {event.horaDesde} – {event.horaHasta}
            </span>
            {event.areas && event.areas.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {event.areas.map((a) => AREA_LABELS[a] ?? a).join(" · ")}
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium rounded-full px-2.5 py-0.5 whitespace-nowrap",
            STATUS_BADGE[event.tipoEvento] ?? "bg-slate-100 text-slate-600 border border-slate-200",
          )}
        >
          {EVENT_TYPE_LABELS[event.tipoEvento] ?? event.tipoEvento}
        </span>
      </div>
    </button>
  )

  // ── Columna con día (abreviatura + número) ─────────────────────────────────
  const renderDayColumn = (day: Date) => {
    const isHoy = isSameDay(day, today)
    return (
      <div className="flex flex-col items-center w-10 shrink-0 pt-1">
        <span className={cn("text-[10px] font-bold tracking-widest", isHoy ? "text-primary" : "text-muted-foreground")}>
          {DAY_SHORT3[day.getDay()]}
        </span>
        <span className={cn("text-xl font-bold leading-none mt-0.5", isHoy ? "text-primary" : "text-foreground")}>
          {day.getDate()}
        </span>
      </div>
    )
  }

  // ── Vista HOY ──────────────────────────────────────────────────────────────
  const renderHoy = () => {
    const evs = getEventsForDate(currentDate)
    return (
      <div className="flex gap-4">
        {renderDayColumn(currentDate)}
        <div className="flex-1 min-w-0 space-y-2">
          {evs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Calendar className="h-9 w-9 opacity-20" />
              <p className="text-sm">No hay eventos este día</p>
            </div>
          ) : (
            evs.map(renderEventCard)
          )}
        </div>
      </div>
    )
  }

  // ── Vista SEMANA ───────────────────────────────────────────────────────────
  const renderSemana = () => (
    <div className="divide-y divide-border">
      {weekDays.map((day) => {
        const dayEvs = getEventsForDate(day)
        return (
          <div key={day.toISOString()} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            {renderDayColumn(day)}
            <div className="flex-1 min-w-0 space-y-2">
              {dayEvs.length === 0 ? (
                <div className="h-10 flex items-center">
                  <span className="text-xs text-muted-foreground/40">—</span>
                </div>
              ) : (
                dayEvs.map(renderEventCard)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Vista MES ──────────────────────────────────────────────────────────────
  const renderMes = () => (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_SHORT.map((day) => (
          <div key={day} className="text-center font-semibold text-xs text-muted-foreground p-2 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-[90px] md:min-h-[110px]" />
          }

          const dayEvents = getEventsForDay(day)
          const isToday =
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()

          return (
            <div
              key={day}
              className={cn(
                "min-h-[90px] md:min-h-[110px] border rounded-lg p-1.5 transition-colors",
                isToday ? "bg-primary/5 border-primary ring-1 ring-primary/30" : "bg-card border-border hover:bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {day}
                </span>
                {dayEvents.length > 4 && (
                  <span className="text-[10px] text-muted-foreground font-medium">{dayEvents.length}</span>
                )}
              </div>

              <div className="space-y-0.5 overflow-y-auto max-h-[120px] md:max-h-[160px] scrollbar-thin">
                {dayEvents.map((event) => {
                  const pillStyle =
                    EVENT_PILL_STYLES[event.tipoEvento] ??
                    "bg-gray-50 border-l-[3px] border-gray-400 text-gray-800 hover:bg-gray-100"
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={cn(
                        "w-full text-left text-[10px] md:text-xs px-1.5 py-0.5 rounded-sm font-medium truncate transition-colors",
                        pillStyle,
                      )}
                      title={`${event.titulo} — ${event.horaDesde} a ${event.horaHasta}`}
                    >
                      <span className="font-semibold">{event.horaDesde}</span> <span>{event.titulo}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-28">
      <div className={cn("mx-auto", view === "mes" ? "max-w-7xl" : "max-w-4xl")}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Calendario <span className="text-primary">Nodo Tecnológico</span>
          </h1>
          <p className="text-muted-foreground mt-1">Vista de eventos</p>
        </div>

        {/* Barra de controles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          {/* Switch Hoy / Semana / Mes */}
          <div className="flex items-center bg-muted rounded-xl p-1 gap-0.5">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v)
                  if (v === "hoy") setCurrentDate(new Date())
                }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  view === v
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <div className="flex items-center gap-2">
            <Button className="bg-white h-8 w-8" onClick={() => navigate(-1)} variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground capitalize min-w-[200px] text-center">
              {rangeLabel()}
            </span>
            <Button className="bg-white h-8 w-8" onClick={() => navigate(1)} variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button className="bg-white h-8" onClick={goToToday} variant="outline" size="sm">
              Hoy
            </Button>
          </div>
        </div>

        {/* Leyenda dinámica */}
        {presentTypes.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {presentTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${EVENT_DOT_COLORS[type] ?? "bg-gray-400"}`} />
                {EVENT_TYPE_LABELS[type] ?? type}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Cargando eventos...</span>
          </div>
        ) : (
          <Card className={view === "mes" ? "p-4" : "p-4 md:p-6"}>
            {view === "hoy" && renderHoy()}
            {view === "semana" && renderSemana()}
            {view === "mes" && renderMes()}
          </Card>
        )}

        {/* Modal de detalle del evento */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedEvent.titulo}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Badges de tipo y áreas */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${EVENT_TYPE_COLORS[selectedEvent.tipoEvento] ?? "bg-gray-500"} text-white border-0`}>
                      {EVENT_TYPE_LABELS[selectedEvent.tipoEvento] ?? selectedEvent.tipoEvento}
                    </Badge>
                    {selectedEvent.areas && selectedEvent.areas.length > 0 ? (
                      selectedEvent.areas.map((area) => (
                        <Badge key={area} className={`${AREA_COLORS[area] ?? "bg-gray-500"} text-white border-0`}>
                          <MapPin className="h-3 w-3 mr-1" />
                          {AREA_LABELS[area] ?? area}
                        </Badge>
                      ))
                    ) : (
                      <Badge className="bg-gray-500 text-white border-0">
                        <MapPin className="h-3 w-3 mr-1" />
                        Sin área asignada
                      </Badge>
                    )}
                  </div>

                  {selectedEvent.descripcion && (
                    <div>
                      <h3 className="font-semibold mb-1">Descripción</h3>
                      <p className="text-sm text-muted-foreground">{selectedEvent.descripcion}</p>
                    </div>
                  )}

                  {selectedEvent.informacion && (
                    <div>
                      <h3 className="font-semibold mb-1">Requerimientos</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedEvent.informacion}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fechas
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {formatDate(selectedEvent.fechaDesde, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {selectedEvent.fechaDesde !== selectedEvent.fechaHasta && (
                        <p className="text-sm text-muted-foreground capitalize">
                          hasta{" "}
                          {formatDate(selectedEvent.fechaHasta, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedEvent.horaDesde} - {selectedEvent.horaHasta}
                      </p>
                    </div>

                    {selectedEvent.organizadorSolicitante && (
                      <div>
                        <h3 className="font-semibold mb-1">Organizador</h3>
                        <p className="text-sm text-muted-foreground">{selectedEvent.organizadorSolicitante}</p>
                      </div>
                    )}
                  </div>

                  {(selectedEvent.convocatoria !== undefined || selectedEvent.coberturaPrensaBol !== undefined) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEvent.convocatoria !== undefined && (
                        <div>
                          <h3 className="font-semibold mb-1 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Convocatoria
                          </h3>
                          <p className="text-sm text-muted-foreground">{selectedEvent.convocatoria} asistentes</p>
                        </div>
                      )}
                      {selectedEvent.coberturaPrensaBol !== undefined && (
                        <div>
                          <h3 className="font-semibold mb-1">Cobertura de Prensa</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedEvent.coberturaPrensaBol ? "Sí" : "No"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEvent.anexos && selectedEvent.anexos.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Anexos
                      </h3>
                      <div className="space-y-2">
                        {selectedEvent.anexos.map((anexo, index) => (
                          <a
                            key={index}
                            href={anexo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Anexo {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.solicitudes && selectedEvent.solicitudes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Solicitudes
                      </h3>
                      <div className="space-y-2">
                        {selectedEvent.solicitudes.map((solicitud, index) => (
                          <a
                            key={index}
                            href={solicitud}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Solicitud {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}