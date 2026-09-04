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

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function rangoFechasSolapa(aD: string, aH: string, bD: string, bH: string): boolean {
  return aD <= bH && aH >= bD
}

function rangoHorarioSolapa(hDA: string, hHA: string, hDB: string, hHB: string): boolean {
  return timeToMinutes(hDA) < timeToMinutes(hHB) && timeToMinutes(hHA) > timeToMinutes(hDB)
}

function calcularConflictos(
  ocupaciones: Ocupacion[],
  eventosCalendario: EventoCalendario[],
  todasLasAreas: BackendArea[],
  fechaDesde: string,
  fechaHasta: string,
  horaDesde: string,
  horaHasta: string,
): { areaIds: Set<number>; eventosBloqueantes: EventoCalendario[] } {
  const areaIds: Set<number> = new Set()
  const eventosBloqueantes: EventoCalendario[] = []

  if (!fechaDesde || !fechaHasta || !horaDesde || !horaHasta) return { areaIds, eventosBloqueantes }
  if (timeToMinutes(horaDesde) >= timeToMinutes(horaHasta))  return { areaIds, eventosBloqueantes }

  for (const oc of ocupaciones) {
    const ocD = oc.fechaDesde.split("T")[0]
    const ocH = oc.fechaHasta.split("T")[0]
    if (!rangoFechasSolapa(fechaDesde, fechaHasta, ocD, ocH)) continue
    if (!rangoHorarioSolapa(horaDesde, horaHasta, oc.horaDesde, oc.horaHasta)) continue
    oc.areas.forEach((r) => areaIds.add(r.areaId))
  }

  for (const ev of eventosCalendario) {
    const evD = ev.fechaDesde.split("T")[0]
    const evH = ev.fechaHasta.split("T")[0]
    if (!rangoFechasSolapa(fechaDesde, fechaHasta, evD, evH)) continue
    if (!rangoHorarioSolapa(horaDesde, horaHasta, ev.horaDesde, ev.horaHasta)) continue
    todasLasAreas.forEach((a) => areaIds.add(a.id))
    eventosBloqueantes.push(ev)
  }

  return { areaIds, eventosBloqueantes }
}

export function AgendarModal({ open, onOpenChange, onSuccess }: AgendarModalProps) {
  const { toast } = useToast()

  const [form,              setForm]              = useState(EMPTY_FORM)
  const [anexos,            setAnexos]            = useState<string[]>([])
  const [newAnexo,          setNewAnexo]          = useState("")
  const [areas,             setAreas]             = useState<BackendArea[]>([])
  const [ocupaciones,       setOcupaciones]       = useState<Ocupacion[]>([])
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([])
  const [areaIds,           setAreaIds]           = useState<number[]>([])
  const [loading,           setLoading]           = useState(false)
  const [loadAreas,         setLoadAreas]         = useState(false)
  const [loadingEventos,    setLoadingEventos]    = useState(false)

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
      .then(setEventosCalendario)
      .catch(() => setEventosCalendario([]))
      .finally(() => setLoadingEventos(false))
  }, [open, form.fechaDesde, form.fechaHasta])

  const { areaIds: areasConConflicto, eventosBloqueantes } = useMemo(
    () => calcularConflictos(
      ocupaciones, eventosCalendario, areas,
      form.fechaDesde, form.fechaHasta, form.horaDesde, form.horaHasta,
    ),
    [ocupaciones, eventosCalendario, areas, form.fechaDesde, form.fechaHasta, form.horaDesde, form.horaHasta],
  )

  useEffect(() => {
    if (areasConConflicto.size === 0) return
    setAreaIds((prev) => prev.filter((id) => !areasConConflicto.has(id)))
  }, [areasConConflicto])

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setAnexos([])
    setNewAnexo("")
    setAreaIds([])
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

    if (eventosBloqueantes.length > 0 && areaIds.every((id) => areasConConflicto.has(id))) {
      toast({
        variant: "destructive",
        title: "Horario no disponible",
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

  const fechasCompletas       = form.fechaDesde && form.fechaHasta && form.horaDesde && form.horaHasta
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
              {loadingEventos && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
            </Label>

            {loadAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...
              </div>
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
                      <button
                        key={area.id}
                        type="button"
                        disabled={bloqueada}
                        onClick={() => toggleArea(area.id)}
                        title={bloqueada && hayConflictoEvento ? "Zona bloqueada por evento del calendario" : bloqueada ? "Zona ocupada en ese horario" : undefined}
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
                {areaIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{areaIds.length} área(s) seleccionada(s)</p>
                )}
              </>
            )}
          </div>

          {/* Edad mín/máx — siempre visible */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edadMin" className="text-sm font-medium">Edad mínima (opcional)</Label>
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
              <Label htmlFor="edadMax" className="text-sm font-medium">Edad máxima (opcional)</Label>
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

          {/* Anexos — siempre visible */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Anexos / enlaces (opcional)
            </Label>
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
