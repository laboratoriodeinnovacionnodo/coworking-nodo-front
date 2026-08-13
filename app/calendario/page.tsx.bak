"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Evento {
  id: number
  titulo: string
  fechaDesde: string
  fechaHasta: string
  horaDesde: string
  horaHasta: string
  tipoEvento: string
  areas: string[]
  organizadorSolicitante: string
  descripcion?: string
  estado: string
}

// ── Constantes ───────────────────────────────────────────────────────────────

const EVENTOS_API = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? "https://localhost:3000/api"

const TIPO_COLORES: Record<string, string> = {
  REUNION:          "bg-blue-50   border-l-[3px] border-blue-400   text-blue-800",
  CAPACITACION:     "bg-green-50  border-l-[3px] border-green-500  text-green-800",
  EVENTO:           "bg-purple-50 border-l-[3px] border-purple-400 text-purple-800",
  CONFERENCIA:      "bg-orange-50 border-l-[3px] border-orange-400 text-orange-800",
  TALLER:           "bg-pink-50   border-l-[3px] border-pink-400   text-pink-800",
  EXPOSICION:       "bg-yellow-50 border-l-[3px] border-yellow-500 text-yellow-800",
}

const TIPO_BADGE: Record<string, string> = {
  REUNION:      "bg-blue-100   text-blue-800",
  CAPACITACION: "bg-green-100  text-green-800",
  EVENTO:       "bg-purple-100 text-purple-800",
  CONFERENCIA:  "bg-orange-100 text-orange-800",
  TALLER:       "bg-pink-100   text-pink-800",
  EXPOSICION:   "bg-yellow-100 text-yellow-800",
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDate(iso: string) {
  // evita off-by-one por timezone al parsear "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function eventoCaeEnDia(ev: Evento, dia: Date) {
  const desde = toLocalDate(ev.fechaDesde)
  const hasta  = toLocalDate(ev.fechaHasta)
  return dia >= desde && dia <= hasta
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const hoy = new Date()
  const [mes, setMes]       = useState(hoy.getMonth())
  const [anio, setAnio]     = useState(hoy.getFullYear())
  const [eventos, setEventos]         = useState<Evento[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null)

  // Fetch eventos del mes visible
  const fetchEventos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${EVENTOS_API}/calendar?year=${anio}&month=${mes + 1}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      // El endpoint /calendar devuelve { events: Evento[], ... }, no un array directo
      setEventos(data.events.filter((e: Evento) => e.tipoEvento !== "CANCELADO"))
    } catch (err) {
      setError("No se pudieron cargar los eventos")
    } finally {
      setLoading(false)
    }
  }, [mes, anio])

  useEffect(() => { fetchEventos() }, [fetchEventos])

  // Construir grilla
  const primerDia  = new Date(anio, mes, 1).getDay()
  const diasEnMes  = new Date(anio, mes + 1, 0).getDate()
  const celdas     = primerDia + diasEnMes
  const totalFilas = Math.ceil(celdas / 7)

  const anterior = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }
  const siguiente = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--background)" }}>

      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-4 border-b border-white/40"
        style={{
          background: "rgba(240,253,255,0.80)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#26a7fc]/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-[#26a7fc]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Agenda NODO</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Eventos públicos</p>
            </div>
          </div>

          {/* Navegador de mes */}
          <div className="flex items-center gap-2">
            <button
              onClick={anterior}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-[#26a7fc] hover:bg-[#26a7fc]/08 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {MESES[mes]} {anio}
            </span>
            <button
              onClick={siguiente}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-[#26a7fc] hover:bg-[#26a7fc]/08 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-2 pt-4">

        {/* Días de semana */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-[#26a7fc]" />
            <span className="text-sm">Cargando eventos...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {error}
          </div>
        )}

        {/* Grilla */}
        {!loading && !error && (
          <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
            {Array.from({ length: totalFilas * 7 }).map((_, idx) => {
              const numeroDia = idx - primerDia + 1
              const esValido  = numeroDia >= 1 && numeroDia <= diasEnMes
              const diaFecha  = esValido ? new Date(anio, mes, numeroDia) : null
              const esHoy     = diaFecha ? isSameDay(diaFecha, hoy) : false
              const eventosDia = diaFecha
                ? eventos.filter((e) => eventoCaeEnDia(e, diaFecha))
                : []

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[80px] p-1 bg-card flex flex-col",
                    !esValido && "bg-muted/30"
                  )}
                >
                  {esValido && (
                    <>
                      {/* Número del día */}
                      <span
                        className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 self-end",
                          esHoy
                            ? "bg-[#26a7fc] text-white font-bold"
                            : "text-foreground"
                        )}
                      >
                        {numeroDia}
                      </span>

                      {/* Pills de eventos */}
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {eventosDia.slice(0, 2).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => setEventoSeleccionado(ev)}
                            className={cn(
                              "w-full text-left text-[9px] md:text-[10px] px-1 py-0.5 rounded-sm font-medium truncate transition-colors",
                              TIPO_COLORES[ev.tipoEvento] ?? "bg-gray-50 border-l-[3px] border-gray-400 text-gray-800"
                            )}
                          >
                            {ev.horaDesde} {ev.titulo}
                          </button>
                        ))}
                        {eventosDia.length > 2 && (
                          <span className="text-[9px] text-muted-foreground pl-1">
                            +{eventosDia.length - 2} más
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Leyenda */}
        {!loading && !error && (
          <div className="flex flex-wrap gap-2 mt-4 px-1">
            {Object.entries(TIPO_BADGE).map(([tipo, cls]) => (
              <span key={tipo} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cls)}>
                {tipo.charAt(0) + tipo.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {eventoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setEventoSeleccionado(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-5 space-y-3"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-foreground leading-snug">
                {eventoSeleccionado.titulo}
              </h2>
              <button
                onClick={() => setEventoSeleccionado(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <span className={cn(
              "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full",
              TIPO_BADGE[eventoSeleccionado.tipoEvento] ?? "bg-gray-100 text-gray-700"
            )}>
              {eventoSeleccionado.tipoEvento.charAt(0) + eventoSeleccionado.tipoEvento.slice(1).toLowerCase()}
            </span>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Fecha</p>
                <p className="font-medium">
                  {toLocalDate(eventoSeleccionado.fechaDesde).toLocaleDateString("es-AR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                  {eventoSeleccionado.fechaDesde !== eventoSeleccionado.fechaHasta && (
                    <> — {toLocalDate(eventoSeleccionado.fechaHasta).toLocaleDateString("es-AR", {
                      day: "numeric", month: "long",
                    })}</>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Horario</p>
                <p className="font-medium">{eventoSeleccionado.horaDesde} – {eventoSeleccionado.horaHasta}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Organizador</p>
                <p className="font-medium">{eventoSeleccionado.organizadorSolicitante}</p>
              </div>
              {eventoSeleccionado.descripcion && (
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Descripción</p>
                  <p className="text-sm text-muted-foreground">{eventoSeleccionado.descripcion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
