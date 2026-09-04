"use client"

import { useState, useCallback, useEffect } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import { areasApi } from "@/lib/api"
import type { CreateOcupacionPayload } from "@/types/ocupacion"
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
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
  CheckSquare,
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

export function AgendarModal({ open, onOpenChange, onSuccess }: AgendarModalProps) {
  const { toast } = useToast()

  const [form,       setForm]       = useState(EMPTY_FORM)
  const [anexos,     setAnexos]     = useState<string[]>([])
  const [newAnexo,   setNewAnexo]   = useState("")
  const [areas,      setAreas]      = useState<BackendArea[]>([])
  const [areaIds,    setAreaIds]    = useState<number[]>([])
  const [loading,    setLoading]    = useState(false)
  const [loadAreas,  setLoadAreas]  = useState(false)
  const [showEdad,   setShowEdad]   = useState(false)
  const [showAnexos, setShowAnexos] = useState(false)

  // Cargar áreas disponibles al abrir
  useEffect(() => {
    if (!open) return
    setLoadAreas(true)
    areasApi.getAll()
      .then(setAreas)
      .catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las áreas" }))
      .finally(() => setLoadAreas(false))
  }, [open, toast])

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setAnexos([])
    setNewAnexo("")
    setAreaIds([])
    setShowEdad(false)
    setShowAnexos(false)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    resetForm()
  }, [onOpenChange, resetForm])

  const toggleArea = (id: number) =>
    setAreaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const addAnexo = () => {
    const url = newAnexo.trim()
    if (!url) return
    setAnexos((prev) => [...prev, url])
    setNewAnexo("")
  }

  const handleSubmit = async () => {
    // Validaciones básicas del formulario
    if (!form.titulo.trim())       { toast({ variant: "destructive", title: "Falta título" });        return }
    if (!form.organizador.trim())  { toast({ variant: "destructive", title: "Falta organizador" });   return }
    if (!form.requerimiento.trim()){ toast({ variant: "destructive", title: "Falta requerimiento" }); return }
    if (!form.fechaDesde)          { toast({ variant: "destructive", title: "Falta fecha desde" });   return }
    if (!form.fechaHasta)          { toast({ variant: "destructive", title: "Falta fecha hasta" });   return }
    if (!form.horaDesde)           { toast({ variant: "destructive", title: "Falta hora desde" });    return }
    if (!form.horaHasta)           { toast({ variant: "destructive", title: "Falta hora hasta" });    return }
    if (areaIds.length === 0)      { toast({ variant: "destructive", title: "Seleccioná al menos un área" }); return }

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
      // ✅ FIX: notifica al padre para que recargue la lista
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al agendar", description: msg })
    } finally {
      setLoading(false)
    }
  }

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

          {/* Áreas */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" /> Áreas a reservar *
            </Label>
            {loadAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {areas.map((area) => {
                  const sel = areaIds.includes(area.id)
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        sel
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {sel && <CheckSquare className="w-3.5 h-3.5" />}
                      {area.nombre}
                    </button>
                  )
                })}
              </div>
            )}
            {areaIds.length > 0 && (
              <p className="text-xs text-muted-foreground">{areaIds.length} área(s) seleccionada(s)</p>
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
