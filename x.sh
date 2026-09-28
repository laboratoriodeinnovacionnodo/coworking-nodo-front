#!/usr/bin/env bash
# ============================================================================
#  v32-front-ocupacion-gmail-recepcion.sh  — coworking-front
#
#  Agrega gmail, recepcion y receptor a Ocupacion:
#  - types/ocupacion.ts             → tipos actualizados
#  - components/agendar-modal.tsx   → bloque recepción arriba del todo
#  - components/editar-ocupacion-modal.tsx → ídem, precargado
#  - components/disponibilidad-inline.tsx  → muestra datos de recepción
# ============================================================================
set -euo pipefail

[[ -f "package.json" && -d "components" ]] || { echo "❌  Corré desde la raíz de coworking-front"; exit 1; }

echo "════════════════════════════════════════════════════════"
echo "  v32-front-ocupacion-gmail-recepcion"
echo "════════════════════════════════════════════════════════"
echo ""

# ── 1. types/ocupacion.ts ─────────────────────────────────────────────────────
echo "📝  types/ocupacion.ts..."
cat > types/ocupacion.ts << 'EOF'
export type RecepcionTurno = "MANANA" | "INTERMEDIO" | "TARDE"

export const RECEPCION_OC_LABELS: Record<RecepcionTurno, string> = {
  MANANA:     "Mañana",
  INTERMEDIO: "Intermedio",
  TARDE:      "Tarde",
}

export const RECEPCION_OC_EMOJI: Record<RecepcionTurno, string> = {
  MANANA:     "☀️",
  INTERMEDIO: "🌅",
  TARDE:      "🌙",
}

export interface OcupacionArea {
  ocupacionId: number
  areaId:      number
  area: {
    id:     number
    nombre: string
  }
}

export interface Ocupacion {
  id:               number
  titulo:           string
  requerimiento:    string
  cantidadPersonas: number
  organizador:      string
  telefono?:        string | null
  gmail?:           string | null
  recepcion?:       RecepcionTurno | null
  receptor?:        string | null
  fechaDesde:       string
  fechaHasta:       string
  horaDesde:        string
  horaHasta:        string
  edadMin?:         number | null
  edadMax?:         number | null
  anexos:           string[]
  liberadaAt?:      string | null
  createdAt:        string
  updatedAt:        string
  areas:            OcupacionArea[]
}

export interface CreateOcupacionPayload {
  titulo:           string
  requerimiento:    string
  cantidadPersonas: number
  organizador:      string
  telefono?:        string
  gmail?:           string
  recepcion?:       RecepcionTurno
  receptor?:        string
  fechaDesde:       string
  fechaHasta:       string
  horaDesde:        string
  horaHasta:        string
  edadMin?:         number
  edadMax?:         number
  anexos?:          string[]
  areaIds:          number[]
}
EOF
echo "  ✅  types/ocupacion.ts"

# ── 2. components/agendar-modal.tsx ──────────────────────────────────────────
echo "📝  components/agendar-modal.tsx..."
cat > components/agendar-modal.tsx << 'EOF'
"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import { areasApi }       from "@/lib/api"
import { getEventosActivosCoworking, type EventoCalendario } from "@/lib/eventos-api"
import type { Ocupacion, CreateOcupacionPayload, RecepcionTurno } from "@/types/ocupacion"
import { RECEPCION_OC_LABELS } from "@/types/ocupacion"
import type { BackendArea } from "@/types/seat"
import { useToast } from "@/hooks/use-toast"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge }    from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { CalendarDays, Clock, Users, User, Phone, FileText, Link2, Plus, Loader2, MapPin, X, CheckSquare, AlertTriangle, Mail, Sun, Sunset, Moon } from "lucide-react"

const RECEPCION_ICONS: Record<RecepcionTurno, React.ElementType> = { MANANA: Sun, INTERMEDIO: Sunset, TARDE: Moon }

interface AgendarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const EMPTY_FORM = {
  titulo: "", requerimiento: "", cantidadPersonas: 1,
  organizador: "", telefono: "", gmail: "", receptor: "",
  fechaDesde: "", fechaHasta: "", horaDesde: "", horaHasta: "",
  edadMin: "", edadMax: "",
}

function timeToMinutes(hhmm: string): number { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m }
function rangoFechasSolapa(aD: string, aH: string, bD: string, bH: string): boolean { return aD <= bH && aH >= bD }
function rangoHorarioSolapa(hDA: string, hHA: string, hDB: string, hHB: string): boolean { return timeToMinutes(hDA) < timeToMinutes(hHB) && timeToMinutes(hHA) > timeToMinutes(hDB) }

function calcularConflictos(ocupaciones: Ocupacion[], eventosCalendario: EventoCalendario[], todasLasAreas: BackendArea[], fechaDesde: string, fechaHasta: string, horaDesde: string, horaHasta: string): { areaIds: Set<number>; eventosBloqueantes: EventoCalendario[] } {
  const areaIds: Set<number> = new Set()
  const eventosBloqueantes: EventoCalendario[] = []
  if (!fechaDesde || !fechaHasta || !horaDesde || !horaHasta) return { areaIds, eventosBloqueantes }
  if (timeToMinutes(horaDesde) >= timeToMinutes(horaHasta)) return { areaIds, eventosBloqueantes }
  for (const oc of ocupaciones) {
    const ocD = oc.fechaDesde.split("T")[0]; const ocH = oc.fechaHasta.split("T")[0]
    if (!rangoFechasSolapa(fechaDesde, fechaHasta, ocD, ocH)) continue
    if (!rangoHorarioSolapa(horaDesde, horaHasta, oc.horaDesde, oc.horaHasta)) continue
    oc.areas.forEach((r) => areaIds.add(r.areaId))
  }
  for (const ev of eventosCalendario) {
    const evD = ev.fechaDesde.split("T")[0]; const evH = ev.fechaHasta.split("T")[0]
    if (!rangoFechasSolapa(fechaDesde, fechaHasta, evD, evH)) continue
    if (!rangoHorarioSolapa(horaDesde, horaHasta, ev.horaDesde, ev.horaHasta)) continue
    todasLasAreas.forEach((a) => areaIds.add(a.id)); eventosBloqueantes.push(ev)
  }
  return { areaIds, eventosBloqueantes }
}

export function AgendarModal({ open, onOpenChange, onSuccess }: AgendarModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState(EMPTY_FORM)
  const [recepcion, setRecepcion] = useState<RecepcionTurno>("MANANA")
  const [anexos, setAnexos] = useState<string[]>([])
  const [newAnexo, setNewAnexo] = useState("")
  const [areas, setAreas] = useState<BackendArea[]>([])
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([])
  const [areaIds, setAreaIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [loadAreas, setLoadAreas] = useState(false)
  const [loadingEventos, setLoadingEventos] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadAreas(true)
    Promise.all([areasApi.getAll(), ocupacionesApi.getActivas()])
      .then(([a, o]) => { setAreas(a); setOcupaciones(o) })
      .catch(() => toast({ variant: "destructive", title: "Error al cargar áreas" }))
      .finally(() => setLoadAreas(false))
  }, [open, toast])

  useEffect(() => {
    if (!open || !form.fechaDesde || !form.fechaHasta) { setEventosCalendario([]); return }
    if (form.fechaDesde > form.fechaHasta) return
    setLoadingEventos(true)
    getEventosActivosCoworking(form.fechaDesde, form.fechaHasta)
      .then(setEventosCalendario).catch(() => setEventosCalendario([]))
      .finally(() => setLoadingEventos(false))
  }, [open, form.fechaDesde, form.fechaHasta])

  const { areaIds: areasConConflicto, eventosBloqueantes } = useMemo(
    () => calcularConflictos(ocupaciones, eventosCalendario, areas, form.fechaDesde, form.fechaHasta, form.horaDesde, form.horaHasta),
    [ocupaciones, eventosCalendario, areas, form.fechaDesde, form.fechaHasta, form.horaDesde, form.horaHasta],
  )

  useEffect(() => {
    if (areasConConflicto.size === 0) return
    setAreaIds((prev) => prev.filter((id) => !areasConConflicto.has(id)))
  }, [areasConConflicto])

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM); setRecepcion("MANANA"); setAnexos([]); setNewAnexo([]); setAreaIds([]); setEventosCalendario([])
  }, [])

  const handleClose = useCallback(() => { onOpenChange(false); resetForm() }, [onOpenChange, resetForm])
  const toggleArea = (id: number) => {
    if (areasConConflicto.has(id)) return
    setAreaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const addAnexo = () => { const url = newAnexo.trim(); if (!url) return; setAnexos((prev) => [...prev, url]); setNewAnexo("") }

  function parsearErrorBackend(err: unknown): string {
    if (!(err instanceof Error)) return "Error desconocido"
    try { const body = JSON.parse(err.message); if (typeof body?.message === "string") return body.message; if (Array.isArray(body?.message)) return body.message.join(", ") } catch {}
    const msg = err.message
    if (msg.includes("Conflicto de horario")) { const match = msg.match(/las áreas \[([^\]]+)\].+\(ocupación "([^"]+)"\)/); if (match) return `Las zonas ${match[1]} ya están reservadas para "${match[2]}" en ese horario.` }
    return msg
  }

  const handleSubmit = async () => {
    if (!form.titulo.trim())        { toast({ variant: "destructive", title: "Falta el título" }); return }
    if (!form.organizador.trim())   { toast({ variant: "destructive", title: "Falta el organizador" }); return }
    if (!form.requerimiento.trim()) { toast({ variant: "destructive", title: "Falta el requerimiento" }); return }
    if (!form.fechaDesde)           { toast({ variant: "destructive", title: "Falta la fecha desde" }); return }
    if (!form.fechaHasta)           { toast({ variant: "destructive", title: "Falta la fecha hasta" }); return }
    if (!form.horaDesde)            { toast({ variant: "destructive", title: "Falta la hora desde" }); return }
    if (!form.horaHasta)            { toast({ variant: "destructive", title: "Falta la hora hasta" }); return }
    if (areaIds.length === 0)       { toast({ variant: "destructive", title: "Seleccioná al menos un área disponible" }); return }
    if (eventosBloqueantes.length > 0 && areaIds.every((id) => areasConConflicto.has(id))) {
      toast({ variant: "destructive", title: "Horario no disponible", description: `Hay un evento ("${eventosBloqueantes[0].titulo}") que ocupa el coworking en ese horario.` }); return
    }
    const payload: CreateOcupacionPayload = {
      titulo: form.titulo.trim(), requerimiento: form.requerimiento.trim(),
      cantidadPersonas: Number(form.cantidadPersonas), organizador: form.organizador.trim(),
      fechaDesde: form.fechaDesde, fechaHasta: form.fechaHasta,
      horaDesde: form.horaDesde, horaHasta: form.horaHasta,
      anexos, areaIds, recepcion,
      ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
      ...(form.gmail.trim()    && { gmail:    form.gmail.trim() }),
      ...(form.receptor.trim() && { receptor: form.receptor.trim() }),
      ...(form.edadMin         && { edadMin: Number(form.edadMin) }),
      ...(form.edadMax         && { edadMax: Number(form.edadMax) }),
    }
    setLoading(true)
    try {
      await ocupacionesApi.create(payload)
      toast({ title: "✅ Ocupación agendada", description: `"${payload.titulo}" creada correctamente` })
      handleClose(); onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo agendar", description: parsearErrorBackend(err) })
    } finally { setLoading(false) }
  }

  const fechasCompletas       = form.fechaDesde && form.fechaHasta && form.horaDesde && form.horaHasta
  const hayConflictoOcupacion = areasConConflicto.size > 0 && eventosBloqueantes.length === 0 && fechasCompletas
  const hayConflictoEvento    = eventosBloqueantes.length > 0 && fechasCompletas

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="w-5 h-5 text-primary" /> Agendar Ocupación
          </DialogTitle>
          <DialogDescription>Reservá uno o más espacios para un evento o actividad</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ── BLOQUE RECEPCIÓN — arriba del todo ── */}
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide">Datos de recepción</p>

            <div className="space-y-1.5">
              <Label htmlFor="ag-gmail" className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="w-3.5 h-3.5" /> Gmail del organizador <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="ag-gmail" type="email" placeholder="organizador@gmail.com" value={form.gmail} onChange={(e) => setForm((f) => ({ ...f, gmail: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ag-receptor" className="flex items-center gap-1.5 text-sm font-medium">
                <User className="w-3.5 h-3.5" /> Nombre del receptor <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="ag-receptor" placeholder="¿Quién recibe al grupo?" value={form.receptor} onChange={(e) => setForm((f) => ({ ...f, receptor: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ag-recepcion" className="text-sm font-medium">Turno de recepción</Label>
              <Select value={recepcion} onValueChange={(v) => setRecepcion(v as RecepcionTurno)}>
                <SelectTrigger id="ag-recepcion" className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECEPCION_OC_LABELS) as RecepcionTurno[]).map((key) => {
                    const Icon = RECEPCION_ICONS[key]
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{RECEPCION_OC_LABELS[key]}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="titulo" className="flex items-center gap-1.5 text-sm font-medium"><FileText className="w-3.5 h-3.5" /> Título *</Label>
            <Input id="titulo" placeholder="Nombre del evento o actividad" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          </div>

          {/* Organizador + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="organizador" className="flex items-center gap-1.5 text-sm font-medium"><User className="w-3.5 h-3.5" /> Organizador *</Label>
              <Input id="organizador" placeholder="Nombre completo" value={form.organizador} onChange={(e) => setForm((f) => ({ ...f, organizador: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono" className="flex items-center gap-1.5 text-sm font-medium"><Phone className="w-3.5 h-3.5" /> Teléfono (opcional)</Label>
              <Input id="telefono" type="tel" placeholder="Ej: +54 383 000-0000" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
            </div>
          </div>

          {/* Requerimiento */}
          <div className="space-y-1.5">
            <Label htmlFor="requerimiento" className="flex items-center gap-1.5 text-sm font-medium"><FileText className="w-3.5 h-3.5" /> Descripción / Requerimientos *</Label>
            <Textarea id="requerimiento" placeholder="Describí la actividad y sus necesidades..." rows={3} value={form.requerimiento} onChange={(e) => setForm((f) => ({ ...f, requerimiento: e.target.value }))} />
          </div>

          {/* Cantidad personas */}
          <div className="space-y-1.5">
            <Label htmlFor="cantidadPersonas" className="flex items-center gap-1.5 text-sm font-medium"><Users className="w-3.5 h-3.5" /> Cantidad estimada de personas *</Label>
            <Input id="cantidadPersonas" type="number" min={1} value={form.cantidadPersonas} onChange={(e) => setForm((f) => ({ ...f, cantidadPersonas: Number(e.target.value) }))} />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fechaDesde" className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="w-3.5 h-3.5" /> Fecha desde *</Label>
              <Input id="fechaDesde" type="date" value={form.fechaDesde} onChange={(e) => setForm((f) => ({ ...f, fechaDesde: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaHasta" className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="w-3.5 h-3.5" /> Fecha hasta *</Label>
              <Input id="fechaHasta" type="date" value={form.fechaHasta} onChange={(e) => setForm((f) => ({ ...f, fechaHasta: e.target.value }))} />
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="horaDesde" className="flex items-center gap-1.5 text-sm font-medium"><Clock className="w-3.5 h-3.5" /> Hora desde *</Label>
              <Input id="horaDesde" type="time" value={form.horaDesde} onChange={(e) => setForm((f) => ({ ...f, horaDesde: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horaHasta" className="flex items-center gap-1.5 text-sm font-medium"><Clock className="w-3.5 h-3.5" /> Hora hasta *</Label>
              <Input id="horaHasta" type="time" value={form.horaHasta} onChange={(e) => setForm((f) => ({ ...f, horaHasta: e.target.value }))} />
            </div>
          </div>

          {hayConflictoEvento && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
              <div className="space-y-1">
                <p className="font-medium">El coworking no está disponible en ese horario</p>
                {eventosBloqueantes.map((ev) => (
                  <p key={ev.id} className="text-xs text-orange-700">Evento: <span className="font-semibold">"{ev.titulo}"</span>{" "}· {ev.fechaDesde.split("T")[0]} {ev.horaDesde}–{ev.horaHasta}</p>
                ))}
              </div>
            </div>
          )}

          {/* Áreas */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" /> Áreas a reservar *
              {loadingEventos && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
            </Label>
            {loadAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...</div>
            ) : (
              <>
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
                      <button key={area.id} type="button" disabled={bloqueada} onClick={() => toggleArea(area.id)}
                        title={bloqueada && hayConflictoEvento ? "Zona bloqueada por evento del calendario" : bloqueada ? "Zona ocupada en ese horario" : undefined}
                        className={["inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                          bloqueada ? "bg-muted text-muted-foreground border-muted-foreground/20 cursor-not-allowed line-through opacity-50"
                          : sel ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted cursor-pointer"].join(" ")}
                      >
                        {sel && !bloqueada && <CheckSquare className="w-3.5 h-3.5" />}
                        {area.nombre}
                        {bloqueada && <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-0.5">{hayConflictoEvento ? "Evento" : "Ocupada"}</Badge>}
                      </button>
                    )
                  })}
                </div>
                {areaIds.length > 0 && <p className="text-xs text-muted-foreground">{areaIds.length} área(s) seleccionada(s)</p>}
              </>
            )}
          </div>

          {/* Edad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edadMin" className="text-sm font-medium">Edad mínima (opcional)</Label>
              <Input id="edadMin" type="number" min={0} placeholder="0" value={form.edadMin} onChange={(e) => setForm((f) => ({ ...f, edadMin: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edadMax" className="text-sm font-medium">Edad máxima (opcional)</Label>
              <Input id="edadMax" type="number" min={0} placeholder="99" value={form.edadMax} onChange={(e) => setForm((f) => ({ ...f, edadMax: e.target.value }))} />
            </div>
          </div>

          {/* Anexos */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Anexos / enlaces (opcional)</Label>
            <div className="flex gap-2">
              <Input placeholder="https://..." value={newAnexo} onChange={(e) => setNewAnexo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnexo() } }} />
              <Button type="button" variant="outline" size="icon" onClick={addAnexo}><Plus className="w-4 h-4" /></Button>
            </div>
            {anexos.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1 text-primary">{url}</span>
                <button type="button" onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</> : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "  ✅  agendar-modal.tsx"

# ── 3. components/editar-ocupacion-modal.tsx ─────────────────────────────────
echo "📝  components/editar-ocupacion-modal.tsx..."
cat > components/editar-ocupacion-modal.tsx << 'EOF'
"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import { areasApi } from "@/lib/api"
import { getEventosActivosCoworking, type EventoCalendario } from "@/lib/eventos-api"
import type { Ocupacion, RecepcionTurno } from "@/types/ocupacion"
import { RECEPCION_OC_LABELS } from "@/types/ocupacion"
import type { BackendArea } from "@/types/seat"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { CalendarDays, Clock, Users, User, Phone, FileText, Link2, Plus, Loader2, MapPin, X, CheckSquare, AlertTriangle, Pencil, Mail, Sun, Sunset, Moon } from "lucide-react"

const RECEPCION_ICONS: Record<RecepcionTurno, React.ElementType> = { MANANA: Sun, INTERMEDIO: Sunset, TARDE: Moon }

interface EditarOcupacionModalProps {
  ocupacion: Ocupacion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function timeToMinutes(hhmm: string): number { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m }
function rangoFechasSolapa(aD: string, aH: string, bD: string, bH: string): boolean { return aD <= bH && aH >= bD }
function rangoHorarioSolapa(hDA: string, hHA: string, hDB: string, hHB: string): boolean { return timeToMinutes(hDA) < timeToMinutes(hHB) && timeToMinutes(hHA) > timeToMinutes(hDB) }

export function EditarOcupacionModal({ ocupacion, open, onOpenChange, onSuccess }: EditarOcupacionModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({ titulo: "", requerimiento: "", cantidadPersonas: 1, organizador: "", telefono: "", gmail: "", receptor: "", fechaDesde: "", fechaHasta: "", horaDesde: "", horaHasta: "", edadMin: "", edadMax: "" })
  const [recepcion, setRecepcion] = useState<RecepcionTurno>("MANANA")
  const [anexos, setAnexos] = useState<string[]>([])
  const [newAnexo, setNewAnexo] = useState("")
  const [areaIds, setAreaIds] = useState<number[]>([])
  const [areas, setAreas] = useState<BackendArea[]>([])
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([])
  const [loading, setLoading] = useState(false)
  const [loadAreas, setLoadAreas] = useState(false)
  const [loadingEventos, setLoadingEventos] = useState(false)

  useEffect(() => {
    if (!open || !ocupacion) return
    setForm({
      titulo: ocupacion.titulo, requerimiento: ocupacion.requerimiento,
      cantidadPersonas: ocupacion.cantidadPersonas, organizador: ocupacion.organizador,
      telefono: ocupacion.telefono ?? "", gmail: ocupacion.gmail ?? "",
      receptor: ocupacion.receptor ?? "",
      fechaDesde: ocupacion.fechaDesde.split("T")[0], fechaHasta: ocupacion.fechaHasta.split("T")[0],
      horaDesde: ocupacion.horaDesde, horaHasta: ocupacion.horaHasta,
      edadMin: ocupacion.edadMin != null ? String(ocupacion.edadMin) : "",
      edadMax: ocupacion.edadMax != null ? String(ocupacion.edadMax) : "",
    })
    setRecepcion((ocupacion.recepcion as RecepcionTurno) ?? "MANANA")
    setAnexos(ocupacion.anexos ?? [])
    setAreaIds(ocupacion.areas.map((r) => r.areaId))
    setLoadAreas(true)
    Promise.all([areasApi.getAll(), ocupacionesApi.getActivas()])
      .then(([a, o]) => { setAreas(a); setOcupaciones(o.filter((oc) => oc.id !== ocupacion.id)) })
      .catch(() => toast({ variant: "destructive", title: "Error al cargar áreas" }))
      .finally(() => setLoadAreas(false))
  }, [open, ocupacion, toast])

  useEffect(() => {
    if (!open || !form.fechaDesde || !form.fechaHasta) { setEventosCalendario([]); return }
    if (form.fechaDesde > form.fechaHasta) return
    setLoadingEventos(true)
    getEventosActivosCoworking(form.fechaDesde, form.fechaHasta).then(setEventosCalendario).catch(() => setEventosCalendario([]).finally(() => setLoadingEventos(false)))
  }, [open, form.fechaDesde, form.fechaHasta])

  const { areaIds: areasConConflicto, eventosBloqueantes } = useMemo(() => {
    const result: Set<number> = new Set(); const bloqueantes: EventoCalendario[] = []
    if (!form.fechaDesde || !form.fechaHasta || !form.horaDesde || !form.horaHasta) return { areaIds: result, eventosBloqueantes: bloqueantes }
    if (timeToMinutes(form.horaDesde) >= timeToMinutes(form.horaHasta)) return { areaIds: result, eventosBloqueantes: bloqueantes }
    for (const oc of ocupaciones) {
      const ocD = oc.fechaDesde.split("T")[0]; const ocH = oc.fechaHasta.split("T")[0]
      if (!rangoFechasSolapa(form.fechaDesde, form.fechaHasta, ocD, ocH)) continue
      if (!rangoHorarioSolapa(form.horaDesde, form.horaHasta, oc.horaDesde, oc.horaHasta)) continue
      oc.areas.forEach((r) => result.add(r.areaId))
    }
    for (const ev of eventosCalendario) {
      const evD = ev.fechaDesde.split("T")[0]; const evH = ev.fechaHasta.split("T")[0]
      if (!rangoFechasSolapa(form.fechaDesde, form.fechaHasta, evD, evH)) continue
      if (!rangoHorarioSolapa(form.horaDesde, form.horaHasta, ev.horaDesde, ev.horaHasta)) continue
      areas.forEach((a) => result.add(a.id)); bloqueantes.push(ev)
    }
    return { areaIds: result, eventosBloqueantes: bloqueantes }
  }, [ocupaciones, eventosCalendario, areas, form.fechaDesde, form.fechaHasta, form.horaDesde, form.horaHasta])

  useEffect(() => { if (areasConConflicto.size === 0) return; setAreaIds((prev) => prev.filter((id) => !areasConConflicto.has(id))) }, [areasConConflicto])

  const handleClose = useCallback(() => { onOpenChange(false) }, [onOpenChange])
  const toggleArea = (id: number) => { if (areasConConflicto.has(id)) return; setAreaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) }
  const addAnexo = () => { const url = newAnexo.trim(); if (!url) return; setAnexos((prev) => [...prev, url]); setNewAnexo("") }

  const handleGuardar = async () => {
    if (!ocupacion) return
    if (!form.titulo.trim())        { toast({ variant: "destructive", title: "Falta el título" }); return }
    if (!form.organizador.trim())   { toast({ variant: "destructive", title: "Falta el organizador" }); return }
    if (!form.requerimiento.trim()) { toast({ variant: "destructive", title: "Falta el requerimiento" }); return }
    if (!form.fechaDesde || !form.fechaHasta || !form.horaDesde || !form.horaHasta) { toast({ variant: "destructive", title: "Completá las fechas y horarios" }); return }
    if (areaIds.length === 0) { toast({ variant: "destructive", title: "Seleccioná al menos un área" }); return }
    setLoading(true)
    try {
      await ocupacionesApi.update(ocupacion.id, {
        titulo: form.titulo.trim(), requerimiento: form.requerimiento.trim(),
        cantidadPersonas: Number(form.cantidadPersonas), organizador: form.organizador.trim(),
        fechaDesde: form.fechaDesde, fechaHasta: form.fechaHasta,
        horaDesde: form.horaDesde, horaHasta: form.horaHasta,
        anexos, areaIds, recepcion,
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        ...(form.gmail.trim()    && { gmail:    form.gmail.trim() }),
        ...(form.receptor.trim() && { receptor: form.receptor.trim() }),
        ...(form.edadMin         && { edadMin: Number(form.edadMin) }),
        ...(form.edadMax         && { edadMax: Number(form.edadMax) }),
      })
      toast({ title: "✅ Ocupación actualizada", description: `"${form.titulo}" guardada correctamente` })
      handleClose(); onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo guardar", description: err instanceof Error ? err.message : "Error desconocido" })
    } finally { setLoading(false) }
  }

  const fechasCompletas       = form.fechaDesde && form.fechaHasta && form.horaDesde && form.horaHasta
  const hayConflictoOcupacion = areasConConflicto.size > 0 && eventosBloqueantes.length === 0 && fechasCompletas
  const hayConflictoEvento    = eventosBloqueantes.length > 0 && fechasCompletas

  if (!ocupacion) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl"><Pencil className="w-5 h-5 text-primary" /> Editar Ocupación</DialogTitle>
          <DialogDescription>Modificá los datos de la ocupación activa</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ── BLOQUE RECEPCIÓN — arriba del todo ── */}
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide">Datos de recepción</p>

            <div className="space-y-1.5">
              <Label htmlFor="eo-gmail" className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="w-3.5 h-3.5" /> Gmail del organizador <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="eo-gmail" type="email" placeholder="organizador@gmail.com" value={form.gmail} onChange={(e) => setForm((f) => ({ ...f, gmail: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eo-receptor" className="flex items-center gap-1.5 text-sm font-medium">
                <User className="w-3.5 h-3.5" /> Nombre del receptor <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="eo-receptor" placeholder="¿Quién recibe al grupo?" value={form.receptor} onChange={(e) => setForm((f) => ({ ...f, receptor: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eo-recepcion" className="text-sm font-medium">Turno de recepción</Label>
              <Select value={recepcion} onValueChange={(v) => setRecepcion(v as RecepcionTurno)}>
                <SelectTrigger id="eo-recepcion" className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECEPCION_OC_LABELS) as RecepcionTurno[]).map((key) => {
                    const Icon = RECEPCION_ICONS[key]
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{RECEPCION_OC_LABELS[key]}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="eo-titulo" className="flex items-center gap-1.5 text-sm font-medium"><FileText className="w-3.5 h-3.5" /> Título *</Label>
            <Input id="eo-titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          </div>

          {/* Organizador + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eo-org" className="flex items-center gap-1.5 text-sm font-medium"><User className="w-3.5 h-3.5" /> Organizador *</Label>
              <Input id="eo-org" value={form.organizador} onChange={(e) => setForm((f) => ({ ...f, organizador: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eo-tel" className="flex items-center gap-1.5 text-sm font-medium"><Phone className="w-3.5 h-3.5" /> Teléfono (opcional)</Label>
              <Input id="eo-tel" type="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
            </div>
          </div>

          {/* Requerimiento */}
          <div className="space-y-1.5">
            <Label htmlFor="eo-req" className="flex items-center gap-1.5 text-sm font-medium"><FileText className="w-3.5 h-3.5" /> Descripción / Requerimientos *</Label>
            <Textarea id="eo-req" rows={3} value={form.requerimiento} onChange={(e) => setForm((f) => ({ ...f, requerimiento: e.target.value }))} />
          </div>

          {/* Cantidad personas */}
          <div className="space-y-1.5">
            <Label htmlFor="eo-personas" className="flex items-center gap-1.5 text-sm font-medium"><Users className="w-3.5 h-3.5" /> Cantidad estimada de personas *</Label>
            <Input id="eo-personas" type="number" min={1} value={form.cantidadPersonas} onChange={(e) => setForm((f) => ({ ...f, cantidadPersonas: Number(e.target.value) }))} />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eo-fdesde" className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="w-3.5 h-3.5" /> Fecha desde *</Label>
              <Input id="eo-fdesde" type="date" value={form.fechaDesde} onChange={(e) => setForm((f) => ({ ...f, fechaDesde: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eo-fhasta" className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="w-3.5 h-3.5" /> Fecha hasta *</Label>
              <Input id="eo-fhasta" type="date" value={form.fechaHasta} onChange={(e) => setForm((f) => ({ ...f, fechaHasta: e.target.value }))} />
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eo-hdesde" className="flex items-center gap-1.5 text-sm font-medium"><Clock className="w-3.5 h-3.5" /> Hora desde *</Label>
              <Input id="eo-hdesde" type="time" value={form.horaDesde} onChange={(e) => setForm((f) => ({ ...f, horaDesde: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eo-hhasta" className="flex items-center gap-1.5 text-sm font-medium"><Clock className="w-3.5 h-3.5" /> Hora hasta *</Label>
              <Input id="eo-hhasta" type="time" value={form.horaHasta} onChange={(e) => setForm((f) => ({ ...f, horaHasta: e.target.value }))} />
            </div>
          </div>

          {hayConflictoEvento && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
              <div className="space-y-1">
                <p className="font-medium">El coworking no está disponible en ese horario</p>
                {eventosBloqueantes.map((ev) => (
                  <p key={ev.id} className="text-xs text-orange-700">Evento: <span className="font-semibold">"{ev.titulo}"</span>{" "}· {ev.fechaDesde.split("T")[0]} {ev.horaDesde}–{ev.horaHasta}</p>
                ))}
              </div>
            </div>
          )}

          {/* Áreas */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" /> Áreas *
              {loadingEventos && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
            </Label>
            {loadAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...</div>
            ) : (
              <>
                {hayConflictoOcupacion && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>Algunas zonas ya están ocupadas en ese horario.</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => {
                    const bloqueada = areasConConflicto.has(area.id); const sel = areaIds.includes(area.id)
                    return (
                      <button key={area.id} type="button" disabled={bloqueada} onClick={() => toggleArea(area.id)}
                        className={["inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                          bloqueada ? "bg-muted text-muted-foreground border-muted-foreground/20 cursor-not-allowed line-through opacity-50"
                          : sel ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted cursor-pointer"].join(" ")}
                      >
                        {sel && !bloqueada && <CheckSquare className="w-3.5 h-3.5" />}
                        {area.nombre}
                        {bloqueada && <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-0.5">{hayConflictoEvento ? "Evento" : "Ocupada"}</Badge>}
                      </button>
                    )
                  })}
                </div>
                {areaIds.length > 0 && <p className="text-xs text-muted-foreground">{areaIds.length} área(s) seleccionada(s)</p>}
              </>
            )}
          </div>

          {/* Edad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eo-emin" className="text-sm font-medium">Edad mínima (opcional)</Label>
              <Input id="eo-emin" type="number" min={0} placeholder="0" value={form.edadMin} onChange={(e) => setForm((f) => ({ ...f, edadMin: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eo-emax" className="text-sm font-medium">Edad máxima (opcional)</Label>
              <Input id="eo-emax" type="number" min={0} placeholder="99" value={form.edadMax} onChange={(e) => setForm((f) => ({ ...f, edadMax: e.target.value }))} />
            </div>
          </div>

          {/* Anexos */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Anexos / enlaces (opcional)</Label>
            <div className="flex gap-2">
              <Input placeholder="https://..." value={newAnexo} onChange={(e) => setNewAnexo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnexo() } }} />
              <Button type="button" variant="outline" size="icon" onClick={addAnexo}><Plus className="w-4 h-4" /></Button>
            </div>
            {anexos.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1 text-primary">{url}</span>
                <button type="button" onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "  ✅  editar-ocupacion-modal.tsx"

# ── 4. components/disponibilidad-inline.tsx — mostrar datos de recepción ──────
echo "📝  components/disponibilidad-inline.tsx..."
cat > components/disponibilidad-inline.tsx << 'EOF'
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion, RecepcionTurno } from "@/types/ocupacion"
import { RECEPCION_OC_LABELS, RECEPCION_OC_EMOJI } from "@/types/ocupacion"
import { useToast }       from "@/hooks/use-toast"
import { Button }         from "@/components/ui/button"
import { Badge }          from "@/components/ui/badge"
import { EditarOcupacionModal } from "@/components/editar-ocupacion-modal"
import {
  Loader2, MapPin, Clock, Users, Unlock,
  RefreshCw, Inbox, Link2, AlertCircle,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Pencil, Mail, User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DisponibilidadInlineProps {
  onSuccess?: () => void
}

const POR_PAGINA = 5

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
}

function timeToMinutes(hhmm: string): number { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m }

function estadoOcupacion(oc: Ocupacion): "vencida" | "en-curso" | "proxima" {
  const ar      = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const minNow  = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  const fechaHoy = ar.toISOString().split("T")[0]
  const ocDesde = oc.fechaDesde.split("T")[0]
  const ocHasta = oc.fechaHasta.split("T")[0]
  if (ocHasta < fechaHoy) return "vencida"
  if (ocDesde > fechaHoy) return "proxima"
  if (ocDesde < fechaHoy && ocHasta > fechaHoy) return "en-curso"
  if (ocDesde === fechaHoy && ocHasta === fechaHoy) {
    const ini = timeToMinutes(oc.horaDesde); const fin = timeToMinutes(oc.horaHasta)
    if (minNow >= fin) return "vencida"; if (minNow >= ini) return "en-curso"; return "proxima"
  }
  if (ocDesde === fechaHoy) return minNow >= timeToMinutes(oc.horaDesde) ? "en-curso" : "proxima"
  return minNow < timeToMinutes(oc.horaHasta) ? "en-curso" : "vencida"
}

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  "en-curso": { label: "En curso", className: "bg-blue-100 text-blue-700 border-blue-200" },
  "proxima":  { label: "Próxima",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "vencida":  { label: "Vencida",  className: "bg-red-100 text-red-700 border-red-200" },
}

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  const toastRef  = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [ocupaciones,   setOcupaciones]   = useState<Ocupacion[]>([])
  const [loading,       setLoading]       = useState(false)
  const [liberando,     setLiberando]     = useState<number | null>(null)
  const [expandedId,    setExpandedId]    = useState<number | null>(null)
  const [pagina,        setPagina]        = useState(1)
  const [editando,      setEditando]      = useState<Ocupacion | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const todas = await ocupacionesApi.getAll()
      const pendientes = todas.filter((o) => !o.liberadaAt)
      pendientes.sort((a, b) => {
        const orden = { "en-curso": 0, "proxima": 1, "vencida": 2 }
        const ea = estadoOcupacion(a); const eb = estadoOcupacion(b)
        if (ea !== eb) return orden[ea] - orden[eb]
        return a.fechaDesde.localeCompare(b.fechaDesde)
      })
      setOcupaciones(pendientes); setPagina(1)
    } catch {
      if (!silencioso) toastRef.current({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
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
      await cargar(true); onSuccess?.()
    } catch (err) {
      toastRef.current({ variant: "destructive", title: "Error al liberar", description: err instanceof Error ? err.message : "Error desconocido" })
    } finally { setLiberando(null) }
  }

  const handleEditar = (oc: Ocupacion, e: React.MouseEvent) => { e.stopPropagation(); setEditando(oc); setEditModalOpen(true) }
  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  const totalPaginas   = Math.max(1, Math.ceil(ocupaciones.length / POR_PAGINA))
  const paginaActual   = Math.min(pagina, totalPaginas)
  const inicio         = (paginaActual - 1) * POR_PAGINA
  const ocupacionesPag = ocupaciones.slice(inicio, inicio + POR_PAGINA)

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5" />
            Zonas ocupadas
            {ocupaciones.length > 0 && <span className="ml-1 text-xs font-normal normal-case">({ocupaciones.length})</span>}
          </h3>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => cargar()} disabled={loading}>
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
          </div>
        ) : ocupaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Inbox className="w-8 h-8 opacity-30" />
            <p className="text-sm font-medium">Sin zonas ocupadas</p>
            <p className="text-xs opacity-60">Todos los espacios están disponibles</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {ocupacionesPag.map((oc) => {
                const estado   = estadoOcupacion(oc)
                const badge    = ESTADO_BADGE[estado]
                const expanded = expandedId === oc.id

                return (
                  <div key={oc.id} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden", estado === "vencida" && "opacity-70")}>

                    {/* Fila principal */}
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-muted/30 transition-colors"
                      onClick={() => toggleExpand(oc.id)}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{oc.titulo}</span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", badge.className)}>{badge.label}</Badge>
                          {estado === "vencida" && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                          {/* Turno badge en fila principal si existe */}
                          {oc.recepcion && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {RECEPCION_OC_EMOJI[oc.recepcion as RecepcionTurno]} {RECEPCION_OC_LABELS[oc.recepcion as RecepcionTurno]}
                            </span>
                          )}
                          <button type="button" title="Editar ocupación"
                            className="ml-auto p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            onClick={(e) => handleEditar(oc, e)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {formatFecha(oc.fechaDesde)}
                            {oc.fechaDesde.split("T")[0] !== oc.fechaHasta.split("T")[0] && ` → ${formatFecha(oc.fechaHasta)}`}
                          </span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{oc.horaDesde} – {oc.horaHasta}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{oc.cantidadPersonas}</span>
                        </div>
                      </div>
                      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                    </button>

                    {/* Detalle expandido */}
                    {expanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t bg-muted/10">
                        {estado === "vencida" && (
                          <div className="flex items-center gap-2 pt-3 text-xs text-red-600">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            El horario ya pasó. Liberá las zonas para que queden disponibles.
                          </div>
                        )}

                        {/* ── Datos de recepción ── */}
                        {(oc.gmail || oc.recepcion || oc.receptor) && (
                          <div className="pt-3 space-y-1.5 rounded-lg bg-primary/5 border border-primary/10 p-2.5">
                            <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">Recepción</p>
                            {oc.recepcion && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span>{RECEPCION_OC_EMOJI[oc.recepcion as RecepcionTurno]}</span>
                                Turno: <span className="font-medium text-foreground">{RECEPCION_OC_LABELS[oc.recepcion as RecepcionTurno]}</span>
                              </p>
                            )}
                            {oc.receptor && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <User className="w-3 h-3" />
                                Receptor: <span className="font-medium text-foreground">{oc.receptor}</span>
                              </p>
                            )}
                            {oc.gmail && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Mail className="w-3 h-3" />
                                <a href={`mailto:${oc.gmail}`} className="font-medium text-primary hover:underline">{oc.gmail}</a>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Zonas */}
                        <div className="space-y-1 pt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Zonas:</p>
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

                        {oc.requerimiento && <p className="text-xs text-muted-foreground border-t pt-2">{oc.requerimiento}</p>}

                        {oc.anexos?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Link2 className="w-3 h-3" /> Anexos:</p>
                            {oc.anexos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary underline truncate block">{url}</a>
                            ))}
                          </div>
                        )}

                        <div className="pt-1 flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={(e) => handleEditar(oc, e)}>
                            <Pencil className="w-3 h-3" /> Editar
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => liberar(oc)} disabled={liberando === oc.id}
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

            {/* Paginado */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">{inicio + 1}–{Math.min(inicio + POR_PAGINA, ocupaciones.length)} de {ocupaciones.length}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                    <Button key={n} variant={n === paginaActual ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPagina(n)}>{n}</Button>
                  ))}
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <EditarOcupacionModal
        ocupacion={editando}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => { cargar(true); onSuccess?.() }}
      />
    </>
  )
}
EOF
echo "  ✅  disponibilidad-inline.tsx"

echo ""
echo "🔨  Build de verificación..."
pnpm build

echo ""
echo "✅  v32-front-ocupacion-gmail-recepcion completado"