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
import {
  CalendarDays, Clock, Users, User, Phone, FileText,
  Link2, Plus, Loader2, MapPin, X, CheckSquare, AlertTriangle,
  Pencil, Mail, Sun, Sunset, Moon,
} from "lucide-react"

// ── helpers de zona ───────────────────────────────────────────────────────────
const ZONA_LABELS: Record<string, string> = {
  A: "Sillones Naranjas",
  B: "Sillones Rojos",
  C: "Semicírculos Negros",
}

function getLetra(nombre: string): string {
  const m = nombre.match(/^([A-Za-z]+)/); return m ? m[1].toUpperCase() : "?"
}
function getNumero(nombre: string): number {
  const m = nombre.match(/(\d+)$/); return m ? parseInt(m[1]) : 0
}
function agruparAreas(areas: BackendArea[]): { letra: string; label: string; items: BackendArea[] }[] {
  const map = new Map<string, BackendArea[]>()
  for (const area of areas) {
    const letra = getLetra(area.nombre)
    if (!map.has(letra)) map.set(letra, [])
    map.get(letra)!.push(area)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, items]) => ({
      letra,
      label: ZONA_LABELS[letra] ?? `Zona ${letra}`,
      items: [...items].sort((a, b) => getNumero(a.nombre) - getNumero(b.nombre)),
    }))
}

const RECEPCION_ICONS: Record<RecepcionTurno, React.ElementType> = { MANANA: Sun, INTERMEDIO: Sunset, TARDE: Moon }

interface EditarOcupacionModalProps {
  ocupacion: Ocupacion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function timeToMinutes(hhmm: string): number { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m }
function rangoFechasSolapa(aD: string, aH: string, bD: string, bH: string): boolean { return aD <= bH && aH >= bD }
function rangoHorarioSolapa(hDA: string, hHA: string, hDB: string, hHB: string): boolean {
  return timeToMinutes(hDA) < timeToMinutes(hHB) && timeToMinutes(hHA) > timeToMinutes(hDB)
}

export function EditarOcupacionModal({ ocupacion, open, onOpenChange, onSuccess }: EditarOcupacionModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    titulo: "", requerimiento: "", cantidadPersonas: 1,
    organizador: "", telefono: "", gmail: "", receptor: "",
    fechaDesde: "", fechaHasta: "", horaDesde: "", horaHasta: "",
    edadMin: "", edadMax: "",
  })
  const [recepcion, setRecepcion]     = useState<RecepcionTurno>("MANANA")
  const [anexos, setAnexos]           = useState<string[]>([])
  const [newAnexo, setNewAnexo]       = useState("")
  const [areaIds, setAreaIds]         = useState<number[]>([])
  const [areas, setAreas]             = useState<BackendArea[]>([])
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([])
  const [loading, setLoading]         = useState(false)
  const [loadAreas, setLoadAreas]     = useState(false)
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
    getEventosActivosCoworking(form.fechaDesde, form.fechaHasta)
      .then(setEventosCalendario).catch(() => setEventosCalendario([]))
      .finally(() => setLoadingEventos(false))
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

  useEffect(() => {
    if (areasConConflicto.size === 0) return
    setAreaIds((prev) => prev.filter((id) => !areasConConflicto.has(id)))
  }, [areasConConflicto])

  const handleClose = useCallback(() => { onOpenChange(false) }, [onOpenChange])
  const toggleArea = (id: number) => {
    if (areasConConflicto.has(id)) return
    setAreaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const addAnexo = () => { const url = newAnexo.trim(); if (!url) return; setAnexos((prev) => [...prev, url]); setNewAnexo("") }

  const handleGuardar = async () => {
    if (!ocupacion) return
    if (!form.titulo.trim())        { toast({ variant: "destructive", title: "Falta el título" }); return }
    if (!form.organizador.trim())   { toast({ variant: "destructive", title: "Falta el organizador" }); return }
    if (!form.requerimiento.trim()) { toast({ variant: "destructive", title: "Falta el requerimiento" }); return }
    if (!form.fechaDesde || !form.fechaHasta || !form.horaDesde || !form.horaHasta) { toast({ variant: "destructive", title: "Completá las fechas y horarios" }); return }
    if (areaIds.length === 0)       { toast({ variant: "destructive", title: "Seleccioná al menos un área" }); return }
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
        ...(form.edadMin && { edadMin: Number(form.edadMin) }),
        ...(form.edadMax && { edadMax: Number(form.edadMax) }),
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
  const grupos                = agruparAreas(areas)

  if (!ocupacion) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pencil className="w-5 h-5 text-primary" /> Editar Ocupación
          </DialogTitle>
          <DialogDescription>Modificá los datos de la ocupación activa</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ── Bloque recepción ── */}
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
                  <p key={ev.id} className="text-xs text-orange-700">
                    Evento: <span className="font-semibold">"{ev.titulo}"</span>{" "}· {ev.fechaDesde.split("T")[0]} {ev.horaDesde}–{ev.horaHasta}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ── Áreas agrupadas por zona ── */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" /> Áreas *
              {loadingEventos && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
            </Label>

            {loadAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...
              </div>
            ) : (
              <div className="space-y-3">
                {hayConflictoOcupacion && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Algunas zonas ya están ocupadas en ese horario.</span>
                  </div>
                )}

                {grupos.map(({ letra, label, items }) => (
                  <div key={letra} className="space-y-1.5">
                    {/* Título de grupo */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex-shrink-0">
                        {letra}
                      </span>
                      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Botones de área */}
                    <div className="flex flex-wrap gap-2 pl-7">
                      {items.map((area) => {
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
                                : bloqueada ? "Zona ocupada en ese horario" : undefined
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
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-0.5">
                                {hayConflictoEvento ? "Evento" : "Ocupada"}
                              </Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {areaIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{areaIds.length} área(s) seleccionada(s)</p>
                )}
              </div>
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
                <button type="button" onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
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
