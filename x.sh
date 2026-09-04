#!/usr/bin/env bash
# ============================================================================
#  v9-fix-conflicto-eventos-calendario.sh  — coworking-front
#
#  Problema: el modal de agendado solo cruzaba contra /ocupaciones/activas
#  (coworking-back). Los eventos del calendario-back (NEXT_PUBLIC_EVENTOS_API_URL)
#  con área COWORKING nunca se consultaban → se podía agendar encima de un
#  evento existente.
#
#  Fix (solo frontend):
#    · lib/eventos-api.ts          → nuevo cliente para calendario-back
#    · components/agendar-modal.tsx → carga eventos activos del calendario
#      y los cruza en calcularAreasConConflicto junto con las ocupaciones
#
#  Reglas de negocio aplicadas:
#    · Eventos con tipoEvento CANCELADO o FINALIZADO → NO bloquean
#    · Solo eventos que incluyan "COWORKING" en su array areas[] → bloquean
#      TODAS las zonas del coworking (ya que un evento externo ocupa el espacio
#      completo, no solo un área interna)
#    · El cruce de fecha+hora es idéntico al de ocupaciones
#
#  Sin cambios de schema. Sin cambios en el backend.
#
#  Uso:
#    cd coworking-front
#    chmod +x v9-fix-conflicto-eventos-calendario.sh
#    ./v9-fix-conflicto-eventos-calendario.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔧  v9 — Bloqueo de zonas por eventos del calendario           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# 1. lib/eventos-api.ts — cliente liviano para calendario-back
# ════════════════════════════════════════════════════════════════════════════
echo "📄  lib/eventos-api.ts..."
cat > lib/eventos-api.ts << 'EOF'
/**
 * lib/eventos-api.ts
 * Cliente de solo-lectura para el calendario-back (NEXT_PUBLIC_EVENTOS_API_URL).
 * Se usa únicamente para verificar conflictos al agendar ocupaciones.
 */

const EVENTOS_BASE =
  process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? ""

// Estados que NO bloquean el agendado (el evento ya no está vigente)
const ESTADOS_INACTIVOS = new Set(["CANCELADO", "FINALIZADO"])

export interface EventoCalendario {
  id:          string
  titulo:      string
  fechaDesde:  string   // ISO o "YYYY-MM-DD"
  fechaHasta:  string
  horaDesde:   string   // "HH:mm"
  horaHasta:   string
  tipoEvento:  string
  areas?:      string[] // e.g. ["COWORKING", "AUDITORIO"]
}

interface CalendarResponse {
  events:      EventoCalendario[]
  totalEvents: number
}

/**
 * Trae los eventos del calendario-back para un rango de meses.
 * Necesitamos cubrir un rango porque el usuario puede agendar a futuro
 * cruzando meses (fechaDesde en un mes, fechaHasta en otro).
 */
async function fetchEventosMes(year: number, month: number): Promise<EventoCalendario[]> {
  if (!EVENTOS_BASE) return []
  try {
    const res = await fetch(
      `${EVENTOS_BASE}/calendar?year=${year}&month=${month}`,
      { cache: "no-store" },
    )
    if (!res.ok) return []
    const data: CalendarResponse = await res.json()
    return data.events ?? []
  } catch {
    return []
  }
}

/**
 * Retorna los eventos activos del calendario-back que:
 *   · tengan área COWORKING
 *   · NO estén CANCELADOS ni FINALIZADOS
 *   · su rango de fechas se superponga con [desde, hasta]
 *
 * Cubre hasta 3 meses para soportar rangos multi-mes.
 */
export async function getEventosActivosCoworking(
  fechaDesde: string,
  fechaHasta: string,
): Promise<EventoCalendario[]> {
  if (!EVENTOS_BASE || !fechaDesde || !fechaHasta) return []

  // Determinar los meses a consultar
  const [yD, mD] = fechaDesde.split("-").map(Number)
  const [yH, mH] = fechaHasta.split("-").map(Number)

  const meses: { year: number; month: number }[] = []
  let y = yD, m = mD
  while (y < yH || (y === yH && m <= mH)) {
    meses.push({ year: y, month: m })
    m++
    if (m > 12) { m = 1; y++ }
    if (meses.length > 6) break // límite de seguridad
  }

  const resultados = await Promise.all(meses.map(({ year, month }) => fetchEventosMes(year, month)))
  const todos = resultados.flat()

  // Deduplicar por id
  const vistos = new Set<string>()
  const deduplicados = todos.filter((e) => {
    if (vistos.has(e.id)) return false
    vistos.add(e.id)
    return true
  })

  return deduplicados.filter((e) => {
    // Solo eventos activos con área COWORKING
    if (ESTADOS_INACTIVOS.has(e.tipoEvento)) return false
    if (!Array.isArray(e.areas) || !e.areas.includes("COWORKING")) return false

    // Superposición de fechas con el rango pedido
    const evDesde = e.fechaDesde.split("T")[0]
    const evHasta = e.fechaHasta.split("T")[0]
    return evDesde <= fechaHasta && evHasta >= fechaDesde
  })
}
EOF
echo "✅  lib/eventos-api.ts"

# ════════════════════════════════════════════════════════════════════════════
# 2. components/agendar-modal.tsx — cruza eventos del calendario
# ════════════════════════════════════════════════════════════════════════════
echo "📄  components/agendar-modal.tsx..."
cat > components/agendar-modal.tsx << 'EOF'
"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import { areasApi }       from "@/lib/api"
import { getEventosActivosCoworking, type EventoCalendario } from "@/lib/eventos-api"
import type { Ocupacion, CreateOcupacionPayload } from "@/types/ocupacion"
import type { BackendArea } from "@/types/seat"
import { useToast } from "@/hooks/use-toast"

import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge }    from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  CalendarDays,
  Clock,
  Users,
  User,
  FileText,
  Link2,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
  CheckSquare,
  AlertTriangle,
} from "lucide-react"

interface AgendarModalProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

const EMPTY_FORM = {
  titulo:           "",
  requerimiento:    "",
  cantidadPersonas: 1,
  organizador:      "",
  fechaDesde:       "",
  fechaHasta:       "",
  horaDesde:        "",
  horaHasta:        "",
  edadMin:          "",
  edadMax:          "",
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function rangoFechassolapa(
  aDesde: string, aHasta: string,
  bDesde: string, bHasta: string,
): boolean {
  return aDesde <= bHasta && aHasta >= bDesde
}

function rangoHorarioSolapa(
  horaDesdeA: string, horaHastaA: string,
  horaDesdeB: string, horaHastaB: string,
): boolean {
  const aI = timeToMinutes(horaDesdeA)
  const aF = timeToMinutes(horaHastaA)
  const bI = timeToMinutes(horaDesdeB)
  const bF = timeToMinutes(horaHastaB)
  return aI < bF && aF > bI
}

/**
 * Calcula qué areaIds del coworking-back tienen conflicto dado:
 *   - ocupaciones activas (coworking-back)
 *   - eventos activos del calendario (calendario-back) con área COWORKING
 *
 * Los eventos del calendario ocupan el coworking COMPLETO → bloquean TODAS
 * las áreas cuando hay solapamiento de fecha+hora.
 */
function calcularConflictos(
  ocupaciones:     Ocupacion[],
  eventosCalendario: EventoCalendario[],
  todasLasAreas:   BackendArea[],
  fechaDesde:      string,
  fechaHasta:      string,
  horaDesde:       string,
  horaHasta:       string,
): { areaIds: Set<number>; eventosBloqueantes: EventoCalendario[] } {
  const areaIds: Set<number> = new Set()
  const eventosBloqueantes:  EventoCalendario[] = []

  if (!fechaDesde || !fechaHasta || !horaDesde || !horaHasta) {
    return { areaIds, eventosBloqueantes }
  }
  if (timeToMinutes(horaDesde) >= timeToMinutes(horaHasta)) {
    return { areaIds, eventosBloqueantes }
  }

  // ── 1. Ocupaciones del coworking-back ─────────────────────────────────
  for (const oc of ocupaciones) {
    const ocDesde = oc.fechaDesde.split("T")[0]
    const ocHasta = oc.fechaHasta.split("T")[0]

    if (!rangoFechassolapa(fechaDesde, fechaHasta, ocDesde, ocHasta)) continue
    if (!rangoHorarioSolapa(horaDesde, horaHasta, oc.horaDesde, oc.horaHasta)) continue

    oc.areas.forEach((r) => areaIds.add(r.areaId))
  }

  // ── 2. Eventos del calendario-back con área COWORKING ─────────────────
  for (const ev of eventosCalendario) {
    const evDesde = ev.fechaDesde.split("T")[0]
    const evHasta = ev.fechaHasta.split("T")[0]

    if (!rangoFechassolapa(fechaDesde, fechaHasta, evDesde, evHasta)) continue
    if (!rangoHorarioSolapa(horaDesde, horaHasta, ev.horaDesde, ev.horaHasta)) continue

    // Un evento en el calendario bloquea TODAS las áreas del coworking
    todasLasAreas.forEach((a) => areaIds.add(a.id))
    eventosBloqueantes.push(ev)
  }

  return { areaIds, eventosBloqueantes }
}

// ── Componente ─────────────────────────────────────────────────────────────

export function AgendarModal({ open, onOpenChange, onSuccess }: AgendarModalProps) {
  const { toast } = useToast()

  const [form,             setForm]             = useState(EMPTY_FORM)
  const [anexos,           setAnexos]           = useState<string[]>([])
  const [newAnexo,         setNewAnexo]         = useState("")
  const [areas,            setAreas]            = useState<BackendArea[]>([])
  const [ocupaciones,      setOcupaciones]      = useState<Ocupacion[]>([])
  const [eventosCalendario,setEventosCalendario]= useState<EventoCalendario[]>([])
  const [areaIds,          setAreaIds]          = useState<number[]>([])
  const [loading,          setLoading]          = useState(false)
  const [loadAreas,        setLoadAreas]        = useState(false)
  const [loadingEventos,   setLoadingEventos]   = useState(false)
  const [showEdad,         setShowEdad]         = useState(false)
  const [showAnexos,       setShowAnexos]       = useState(false)

  // Al abrir → cargar áreas y ocupaciones (datos base, no dependen de fechas)
  useEffect(() => {
    if (!open) return
    setLoadAreas(true)
    Promise.all([areasApi.getAll(), ocupacionesApi.getActivas()])
      .then(([a, o]) => { setAreas(a); setOcupaciones(o) })
      .catch(() => toast({ variant: "destructive", title: "Error al cargar áreas" }))
      .finally(() => setLoadAreas(false))
  }, [open, toast])

  // Cuando cambian las fechas → cargar eventos del calendario para ese rango
  useEffect(() => {
    if (!open || !form.fechaDesde || !form.fechaHasta) {
      setEventosCalendario([])
      return
    }
    if (form.fechaDesde > form.fechaHasta) return

    setLoadingEventos(true)
    getEventosActivosCoworking(form.fechaDesde, form.fechaHasta)
      .then(setEventosCalendario)
      .catch(() => setEventosCalendario([]))  // silencioso — no bloquear la UX
      .finally(() => setLoadingEventos(false))
  }, [open, form.fechaDesde, form.fechaHasta])

  // Conflictos reactivos: se recalculan ante cualquier cambio de fecha/hora
  const { areaIds: areasConConflicto, eventosBloqueantes } = useMemo(
    () => calcularConflictos(
      ocupaciones,
      eventosCalendario,
      areas,
      form.fechaDesde,
      form.fechaHasta,
      form.horaDesde,
      form.horaHasta,
    ),
    [ocupaciones, eventosCalendario, areas, form.fechaDesde, form.fechaHasta, form.horaDesde, form.horaHasta],
  )

  // Auto-deseleccionar áreas que quedaron bloqueadas
  useEffect(() => {
    if (areasConConflicto.size === 0) return
    setAreaIds((prev) => prev.filter((id) => !areasConConflicto.has(id)))
  }, [areasConConflicto])

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setAnexos([])
    setNewAnexo("")
    setAreaIds([])
    setShowEdad(false)
    setShowAnexos(false)
    setEventosCalendario([])
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    resetForm()
  }, [onOpenChange, resetForm])

  const toggleArea = (id: number) => {
    if (areasConConflicto.has(id)) return
    setAreaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const addAnexo = () => {
    const url = newAnexo.trim()
    if (!url) return
    setAnexos((prev) => [...prev, url])
    setNewAnexo("")
  }

  function parsearErrorBackend(err: unknown): string {
    if (!(err instanceof Error)) return "Error desconocido"
    try {
      const body = JSON.parse(err.message)
      if (typeof body?.message === "string") return body.message
      if (Array.isArray(body?.message))      return body.message.join(", ")
    } catch { /* mensaje plano */ }
    const msg = err.message
    if (msg.includes("Conflicto de horario")) {
      const match = msg.match(/las áreas \[([^\]]+)\].+\(ocupación "([^"]+)"\)/)
      if (match) return `Las zonas ${match[1]} ya están reservadas para "${match[2]}" en ese horario.`
    }
    return msg
  }

  const handleSubmit = async () => {
    if (!form.titulo.trim())        { toast({ variant: "destructive", title: "Falta el título" });        return }
    if (!form.organizador.trim())   { toast({ variant: "destructive", title: "Falta el organizador" });   return }
    if (!form.requerimiento.trim()) { toast({ variant: "destructive", title: "Falta el requerimiento" }); return }
    if (!form.fechaDesde)           { toast({ variant: "destructive", title: "Falta la fecha desde" });   return }
    if (!form.fechaHasta)           { toast({ variant: "destructive", title: "Falta la fecha hasta" });   return }
    if (!form.horaDesde)            { toast({ variant: "destructive", title: "Falta la hora desde" });    return }
    if (!form.horaHasta)            { toast({ variant: "destructive", title: "Falta la hora hasta" });    return }
    if (areaIds.length === 0)       { toast({ variant: "destructive", title: "Seleccioná al menos un área disponible" }); return }

    // Guardia final: si el calendario bloqueó todo, no dejar pasar
    if (eventosBloqueantes.length > 0 && areaIds.every((id) => areasConConflicto.has(id))) {
      toast({
        variant:     "destructive",
        title:       "Horario no disponible",
        description: `Hay un evento en el calendario ("${eventosBloqueantes[0].titulo}") que ocupa el coworking en ese horario.`,
      })
      return
    }

    const payload: CreateOcupacionPayload = {
      titulo:           form.titulo.trim(),
      requerimiento:    form.requerimiento.trim(),
      cantidadPersonas: Number(form.cantidadPersonas),
      organizador:      form.organizador.trim(),
      fechaDesde:       form.fechaDesde,
      fechaHasta:       form.fechaHasta,
      horaDesde:        form.horaDesde,
      horaHasta:        form.horaHasta,
      anexos,
      areaIds,
      ...(form.edadMin && { edadMin: Number(form.edadMin) }),
      ...(form.edadMax && { edadMax: Number(form.edadMax) }),
    }

    setLoading(true)
    try {
      await ocupacionesApi.create(payload)
      toast({ title: "✅ Ocupación agendada", description: `"${payload.titulo}" creada correctamente` })
      handleClose()
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo agendar", description: parsearErrorBackend(err) })
    } finally {
      setLoading(false)
    }
  }

  const fechasCompletas = form.fechaDesde && form.fechaHasta && form.horaDesde && form.horaHasta
  const hayConflictoOcupacion = areasConConflicto.size > 0 && eventosBloqueantes.length === 0 && fechasCompletas
  const hayConflictoEvento    = eventosBloqueantes.length > 0 && fechasCompletas

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="w-5 h-5 text-primary" />
            Agendar Ocupación
          </DialogTitle>
          <DialogDescription>
            Reservá uno o más espacios para un evento o actividad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="titulo" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5" /> Título *
            </Label>
            <Input
              id="titulo"
              placeholder="Ej: Taller de fotografía"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>

          {/* Organizador */}
          <div className="space-y-1.5">
            <Label htmlFor="organizador" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="w-3.5 h-3.5" /> Organizador *
            </Label>
            <Input
              id="organizador"
              placeholder="Nombre del responsable"
              value={form.organizador}
              onChange={(e) => setForm((f) => ({ ...f, organizador: e.target.value }))}
            />
          </div>

          {/* Requerimiento */}
          <div className="space-y-1.5">
            <Label htmlFor="requerimiento" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5" /> Requerimiento *
            </Label>
            <Textarea
              id="requerimiento"
              placeholder="Describe los requerimientos del espacio..."
              rows={2}
              value={form.requerimiento}
              onChange={(e) => setForm((f) => ({ ...f, requerimiento: e.target.value }))}
            />
          </div>

          {/* Cantidad de personas */}
          <div className="space-y-1.5">
            <Label htmlFor="cantPersonas" className="flex items-center gap-1.5 text-sm font-medium">
              <Users className="w-3.5 h-3.5" /> Cantidad de personas *
            </Label>
            <Input
              id="cantPersonas"
              type="number"
              min={1}
              value={form.cantidadPersonas}
              onChange={(e) => setForm((f) => ({ ...f, cantidadPersonas: Number(e.target.value) }))}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fechaDesde" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-3.5 h-3.5" /> Fecha desde *
              </Label>
              <Input
                id="fechaDesde"
                type="date"
                value={form.fechaDesde}
                onChange={(e) => setForm((f) => ({ ...f, fechaDesde: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaHasta" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-3.5 h-3.5" /> Fecha hasta *
              </Label>
              <Input
                id="fechaHasta"
                type="date"
                value={form.fechaHasta}
                onChange={(e) => setForm((f) => ({ ...f, fechaHasta: e.target.value }))}
              />
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="horaDesde" className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" /> Hora desde *
              </Label>
              <Input
                id="horaDesde"
                type="time"
                value={form.horaDesde}
                onChange={(e) => setForm((f) => ({ ...f, horaDesde: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horaHasta" className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" /> Hora hasta *
              </Label>
              <Input
                id="horaHasta"
                type="time"
                value={form.horaHasta}
                onChange={(e) => setForm((f) => ({ ...f, horaHasta: e.target.value }))}
              />
            </div>
          </div>

          {/* Alerta: evento del calendario bloquea todo */}
          {hayConflictoEvento && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
              <div className="space-y-1">
                <p className="font-medium">El coworking no está disponible en ese horario</p>
                {eventosBloqueantes.map((ev) => (
                  <p key={ev.id} className="text-xs text-orange-700">
                    Evento: <span className="font-semibold">"{ev.titulo}"</span>
                    {" "}· {ev.fechaDesde.split("T")[0]} {ev.horaDesde}–{ev.horaHasta}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Áreas */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" /> Áreas a reservar *
              {loadingEventos && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />
              )}
            </Label>

            {loadAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...
              </div>
            ) : (
              <>
                {/* Alerta de zonas ocupadas por otras ocupaciones */}
                {hayConflictoOcupacion && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Algunas zonas ya están ocupadas en ese horario.</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => {
                    const bloqueada = areasConConflicto.has(area.id)
                    const sel       = areaIds.includes(area.id)

                    return (
                      <button
                        key={area.id}
                        type="button"
                        disabled={bloqueada}
                        onClick={() => toggleArea(area.id)}
                        title={
                          bloqueada && hayConflictoEvento
                            ? "Zona bloqueada por evento del calendario"
                            : bloqueada
                            ? "Zona ocupada en ese horario"
                            : undefined
                        }
                        className={[
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                          bloqueada
                            ? "bg-muted text-muted-foreground border-muted-foreground/20 cursor-not-allowed line-through opacity-50"
                            : sel
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:bg-muted cursor-pointer",
                        ].join(" ")}
                      >
                        {sel && !bloqueada && <CheckSquare className="w-3.5 h-3.5" />}
                        {area.nombre}
                        {bloqueada && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0 ml-0.5"
                          >
                            {hayConflictoEvento ? "Evento" : "Ocupada"}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>

                {areaIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {areaIds.length} área(s) seleccionada(s)
                  </p>
                )}
              </>
            )}
          </div>

          {/* Edad (colapsable) */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowEdad((v) => !v)}
            >
              {showEdad ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Restricción de edad (opcional)
            </button>
            {showEdad && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edadMin" className="text-sm font-medium">Edad mínima</Label>
                  <Input
                    id="edadMin"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.edadMin}
                    onChange={(e) => setForm((f) => ({ ...f, edadMin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edadMax" className="text-sm font-medium">Edad máxima</Label>
                  <Input
                    id="edadMax"
                    type="number"
                    min={0}
                    placeholder="99"
                    value={form.edadMax}
                    onChange={(e) => setForm((f) => ({ ...f, edadMax: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Anexos (colapsable) */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAnexos((v) => !v)}
            >
              {showAnexos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Anexos / enlaces (opcional)
            </button>
            {showAnexos && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={newAnexo}
                    onChange={(e) => setNewAnexo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnexo() } }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addAnexo}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {anexos.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1 text-primary">{url}</span>
                    <button
                      type="button"
                      onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</>
              : "Agendar"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "✅  components/agendar-modal.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 3. Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v9-fix-conflicto-eventos-calendario.sh completado          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Archivos nuevos/modificados:"
echo "    · lib/eventos-api.ts          → cliente de solo-lectura para"
echo "                                    calendario-back (/calendar?year&month)"
echo "    · components/agendar-modal.tsx→ cruza eventos del calendario"
echo "                                    junto con ocupaciones activas"
echo ""
echo "  Reglas aplicadas:"
echo "    · Eventos CANCELADO / FINALIZADO → NO bloquean"
echo "    · Evento con área COWORKING + solapamiento fecha+hora → bloquea"
echo "      TODAS las zonas (el evento ocupa el espacio completo)"
echo "    · Badge diferenciado: 'Evento' vs 'Ocupada'"
echo "    · Alert naranja cuando es un evento del calendario"
echo "    · Loader en el label de áreas mientras carga eventos"
echo "    · Guardia final en handleSubmit antes del POST"
echo ""
echo "  Sin cambios de schema. Sin cambios en coworking-back."
echo ""