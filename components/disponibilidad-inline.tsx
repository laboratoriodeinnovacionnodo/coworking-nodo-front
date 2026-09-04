"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import {
  Loader2, MapPin, Clock, Users, Unlock,
  RefreshCw, Inbox, Link2, ChevronDown, ChevronUp, CalendarDays,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DisponibilidadInlineProps {
  onSuccess?: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  })
}

/** Compara solo la parte de fecha (ignora hora) */
function compareFecha(iso: string, hoy: Date): "pasada" | "hoy" | "futura" {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  const f = new Date(y, m - 1, d)
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  if (f < h) return "pasada"
  if (f.getTime() === h.getTime()) return "hoy"
  return "futura"
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/**
 * Determina el estado visual de una ocupación:
 *  - "vencida"  → la hora de fin ya pasó hoy (o la fecha entera pasó)
 *  - "en-curso" → está activa ahora mismo
 *  - "proxima"  → fecha/hora futura
 */
function estadoOcupacion(oc: Ocupacion): "vencida" | "en-curso" | "proxima" {
  const hoy    = new Date()
  // minutos actuales en Argentina (UTC-3)
  const ar     = new Date(hoy.getTime() - 3 * 60 * 60 * 1000)
  const minNow = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  const fechaHoy = `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, "0")}-${String(ar.getUTCDate()).padStart(2, "0")}`

  const ocDesde  = oc.fechaDesde.split("T")[0]
  const ocHasta  = oc.fechaHasta.split("T")[0]

  if (ocHasta < fechaHoy) return "vencida"

  if (ocDesde > fechaHoy) return "proxima"

  // ocDesde <= hoy <= ocHasta
  if (ocDesde < fechaHoy && ocHasta > fechaHoy) return "en-curso"  // multi-día, día intermedio

  if (ocDesde === fechaHoy && ocHasta === fechaHoy) {
    const ini = timeToMinutes(oc.horaDesde)
    const fin = timeToMinutes(oc.horaHasta)
    if (minNow >= fin)  return "vencida"
    if (minNow >= ini)  return "en-curso"
    return "proxima"
  }

  if (ocDesde === fechaHoy) {
    // empieza hoy, termina otro día
    return minNow >= timeToMinutes(oc.horaDesde) ? "en-curso" : "proxima"
  }

  // termina hoy
  return minNow < timeToMinutes(oc.horaHasta) ? "en-curso" : "vencida"
}

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  "en-curso": { label: "En curso",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  "proxima":  { label: "Próxima",   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "vencida":  { label: "Vencida",   className: "bg-red-100 text-red-700 border-red-200" },
}

// ── Componente ────────────────────────────────────────────────────────────────

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  const toastRef  = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(false)
  const [liberando,   setLiberando]   = useState<number | null>(null)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  // Carga TODAS sin liberadaAt — el filtro de "solo activas" era lo que ocultaba registros
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const todas = await ocupacionesApi.getAll()
      // Filtrar solo las que NO fueron liberadas manualmente
      const pendientes = todas.filter((o) => !o.liberadaAt)
      // Ordenar: en-curso primero, luego proximas, luego vencidas; dentro de cada grupo por fechaDesde
      pendientes.sort((a, b) => {
        const orden = { "en-curso": 0, "proxima": 1, "vencida": 2 }
        const ea = estadoOcupacion(a)
        const eb = estadoOcupacion(b)
        if (ea !== eb) return orden[ea] - orden[eb]
        return a.fechaDesde.localeCompare(b.fechaDesde)
      })
      setOcupaciones(pendientes)
    } catch {
      if (!silencioso) {
        toastRef.current({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
      }
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const liberar = async (oc: Ocupacion) => {
    setLiberando(oc.id)
    try {
      await ocupacionesApi.liberar(oc.id)
      toastRef.current({ title: "✅ Zonas liberadas", description: `"${oc.titulo}" finalizada` })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      toastRef.current({
        variant: "destructive",
        title: "Error al liberar",
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id))

  const hoy = new Date()

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
          <MapPin className="w-3.5 h-3.5" />
          Zonas ocupadas
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => cargar()}
          disabled={loading}
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : ocupaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Inbox className="w-8 h-8 opacity-30" />
          <p className="text-sm font-medium">Sin zonas ocupadas</p>
          <p className="text-xs opacity-60">Todos los espacios están disponibles</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ocupaciones.map((oc) => {
            const estado   = estadoOcupacion(oc)
            const badge    = ESTADO_BADGE[estado]
            const expanded = expandedId === oc.id

            return (
              <div
                key={oc.id}
                className={cn(
                  "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden",
                  estado === "vencida" && "opacity-70",
                )}
              >
                {/* Fila principal */}
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(oc.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{oc.titulo}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 border", badge.className)}
                      >
                        {badge.label}
                      </Badge>
                      {estado === "vencida" && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatFecha(oc.fechaDesde)}
                        {oc.fechaDesde.split("T")[0] !== oc.fechaHasta.split("T")[0] &&
                          ` → ${formatFecha(oc.fechaHasta)}`
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {oc.horaDesde} – {oc.horaHasta}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {oc.cantidadPersonas}
                      </span>
                    </div>
                  </div>
                  {expanded
                    ? <ChevronUp   className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  }
                </button>

                {/* Detalle expandido */}
                {expanded && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t bg-muted/10">

                    {/* Aviso si está vencida y no liberada */}
                    {estado === "vencida" && (
                      <div className="flex items-center gap-2 pt-3 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        El horario de esta ocupación ya pasó. Liberá las zonas para que queden disponibles.
                      </div>
                    )}

                    {/* Áreas */}
                    <div className="space-y-1 pt-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Zonas:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {oc.areas?.length > 0
                          ? oc.areas.map((r) => (
                              <Badge key={r.areaId} variant="secondary" className="text-xs">
                                {r.area?.nombre ?? `Área ${r.areaId}`}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">Sin zonas</span>
                        }
                      </div>
                    </div>

                    {/* Requerimiento */}
                    {oc.requerimiento && (
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        {oc.requerimiento}
                      </p>
                    )}

                    {/* Anexos */}
                    {oc.anexos?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Anexos:
                        </p>
                        {oc.anexos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary underline truncate block">
                            {url}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Acción liberar */}
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => liberar(oc)}
                        disabled={liberando === oc.id}
                      >
                        {liberando === oc.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Liberando...</>
                          : <><Unlock className="w-3 h-3" /> Liberar áreas</>
                        }
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
