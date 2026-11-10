"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion, RecepcionTurno } from "@/types/ocupacion"
import { RECEPCION_OC_LABELS, RECEPCION_OC_EMOJI } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button }   from "@/components/ui/button"
import { Badge }    from "@/components/ui/badge"
import { Input }    from "@/components/ui/input"
import {
  Loader2, History, Clock, Users, MapPin, RefreshCw, Inbox, Search,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mail, User, Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const POR_PAGINA = 8

// ── helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

/** Instante (ms) en que terminó la ocupación, para ordenar. */
function finDeOcupacion(oc: Ocupacion): number {
  if (oc.liberadaAt) return new Date(oc.liberadaAt).getTime()
  const [y, m, d] = oc.fechaHasta.split("T")[0].split("-").map(Number)
  const [hh, mm]  = oc.horaHasta.split(":").map(Number)
  // hora Argentina (UTC-3) → UTC
  return Date.UTC(y, m - 1, d, hh + 3, mm)
}

/** Finalizada = liberada manualmente o ya pasó su fecha/hora de fin (horario Argentina). */
function ocupacionFinalizada(oc: Ocupacion): boolean {
  if (oc.liberadaAt) return true
  const ar       = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const fechaHoy = ar.toISOString().split("T")[0]
  const minNow   = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  const hasta    = oc.fechaHasta.split("T")[0]
  if (hasta < fechaHoy) return true
  return hasta === fechaHoy && minNow >= timeToMinutes(oc.horaHasta)
}

// ── componente ───────────────────────────────────────────────────────────────

export function HistorialInline() {
  const { toast } = useToast()
  const toastRef  = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(false)
  const [busqueda,    setBusqueda]    = useState("")
  const [pagina,      setPagina]      = useState(1)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const ocs = await ocupacionesApi.getAll()
      setOcupaciones(ocs.filter(ocupacionFinalizada).sort((a, b) => finDeOcupacion(b) - finDeOcupacion(a)))
    } catch {
      toastRef.current({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setPagina(1); setExpandedId(null) }, [busqueda])

  const q = busqueda.trim().toLowerCase()

  const ocupacionesFiltradas = useMemo(
    () => ocupaciones.filter((o) =>
      !q || [o.titulo, o.organizador, o.gmail, o.receptor, ...(o.areas ?? []).map((a) => a.area?.nombre)]
        .some((v) => v?.toLowerCase().includes(q))),
    [ocupaciones, q],
  )
  const total        = ocupacionesFiltradas.length
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio       = (paginaActual - 1) * POR_PAGINA
  const toggle       = (id: number) => setExpandedId((p) => (p === id ? null : id))

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
          <History className="w-3.5 h-3.5" />
          Historial
          {ocupaciones.length > 0 && <span className="ml-1 text-xs font-normal normal-case">({ocupaciones.length})</span>}
        </h3>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={cargar} disabled={loading}>
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Actualizar
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título, organizador, zona..."
          className="pl-9 h-9 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Inbox className="w-8 h-8 opacity-30" />
          <p className="text-sm font-medium">{q ? "Sin resultados" : "Todavía no hay reservas finalizadas"}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {ocupacionesFiltradas.slice(inicio, inicio + POR_PAGINA).map((oc) => {
                  const expanded = expandedId === oc.id
                  return (
                    <div key={oc.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                      <button type="button" onClick={() => toggle(oc.id)}
                        className="w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{oc.titulo}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border bg-slate-100 text-slate-600 border-slate-200">
                              {oc.liberadaAt ? "Liberada" : "Finalizada"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            <span>
                              {formatFecha(oc.fechaDesde)}
                              {oc.fechaDesde.split("T")[0] !== oc.fechaHasta.split("T")[0] && ` → ${formatFecha(oc.fechaHasta)}`}
                            </span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{oc.horaDesde} – {oc.horaHasta}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{oc.cantidadPersonas}</span>
                          </div>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5" />}
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4 pt-3 space-y-3 border-t bg-muted/10 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5"><User className="w-3 h-3" /> Organizador: <span className="font-medium text-foreground">{oc.organizador}</span></p>
                          {oc.telefono && <p>Teléfono: <span className="font-medium text-foreground">{oc.telefono}</span></p>}
                          {oc.recepcion && (
                            <p>{RECEPCION_OC_EMOJI[oc.recepcion as RecepcionTurno]} Turno: <span className="font-medium text-foreground">{RECEPCION_OC_LABELS[oc.recepcion as RecepcionTurno]}</span></p>
                          )}
                          {oc.receptor && <p>Receptor: <span className="font-medium text-foreground">{oc.receptor}</span></p>}
                          {oc.gmail && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> <a href={`mailto:${oc.gmail}`} className="font-medium text-primary hover:underline">{oc.gmail}</a></p>}
                          <div className="space-y-1">
                            <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zonas:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {oc.areas?.length
                                ? oc.areas.map((r) => <Badge key={r.areaId} variant="secondary" className="text-xs">{r.area?.nombre ?? `Área ${r.areaId}`}</Badge>)
                                : <span>Sin zonas</span>}
                            </div>
                          </div>
                          {oc.requerimiento && <p className="border-t pt-2">{oc.requerimiento}</p>}
                          {oc.anexos?.length > 0 && (
                            <div className="space-y-1">
                              <p className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Anexos:</p>
                              {oc.anexos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate block">{url}</a>
                              ))}
                            </div>
                          )}
                          {oc.liberadaAt && <p>Liberada el {formatFechaHora(oc.liberadaAt)}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">{inicio + 1}–{Math.min(inicio + POR_PAGINA, total)} de {total}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs px-2 text-muted-foreground">{paginaActual} / {totalPaginas}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
