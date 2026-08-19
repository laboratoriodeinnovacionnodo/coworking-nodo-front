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
  COWORKING: "Coworking",
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

// ── Página ───────────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const [events, setEvents] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null)

  const loadEvents = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setLoading(true)
      try {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1
        const res = await fetch(`${EVENTOS_API}/calendar?year=${year}&month=${month}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        setEvents(data.events ?? [])
      } catch (err) {
        if (!silencioso) console.error("Error cargando eventos:", err)
      } finally {
        if (!silencioso) setLoading(false)
      }
    },
    [currentDate],
  )

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Polling silencioso cada 5 min, igual que el calendario público
  useEffect(() => {
    const intervalo = setInterval(() => loadEvents(true), 5 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [loadEvents])

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const getEventsForDay = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    return events
      .filter((event) => {
        const eventStart = event.fechaDesde.split("T")[0]
        const eventEnd = event.fechaHasta.split("T")[0]
        return dateStr >= eventStart && dateStr <= eventEnd
      })
      .sort((a, b) => a.horaDesde.localeCompare(b.horaDesde))
  }

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const goToToday = () => setCurrentDate(new Date())

  const days = getDaysInMonth()
  const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const presentTypes = [...new Set(events.map((e) => e.tipoEvento))]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground capitalize">
              Calendario <span className="text-primary">{monthName}</span>
            </h1>
            <p className="text-muted-foreground mt-1">Vista de eventos</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button className="bg-white" onClick={previousMonth} variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button className="bg-white" onClick={goToToday} variant="outline">
              Hoy
            </Button>
            <Button className="bg-white" onClick={nextMonth} variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
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
          <Card className="p-4">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-xs text-muted-foreground p-2 uppercase tracking-wide"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-[90px] md:min-h-[110px]" />
                }

                const dayEvents = getEventsForDay(day)
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear()

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-[90px] md:min-h-[110px] border rounded-lg p-1.5 transition-colors",
                      isToday
                        ? "bg-primary/5 border-primary ring-1 ring-primary/30"
                        : "bg-card border-border hover:bg-muted/30",
                    )}
                  >
                    {/* Número del día */}
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

                    {/* Eventos del día */}
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