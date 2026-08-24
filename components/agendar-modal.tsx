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

const hoy = () => new Date().toISOString().split("T")[0]

const EMPTY_FORM: CreateOcupacionPayload = {
  titulo:           "",
  requerimiento:    "",
  cantidadPersonas: 1,
  organizador:      "",
  fechaDesde:       hoy(),
  fechaHasta:       hoy(),
  horaDesde:        "09:00",
  horaHasta:        "12:00",
  edadMin:          undefined,
  edadMax:          undefined,
  anexos:           [],
  areaIds:          [],
}

export function AgendarModal({ open, onOpenChange, onSuccess }: AgendarModalProps) {
  const { toast } = useToast()

  const [form,       setForm]       = useState<CreateOcupacionPayload>(EMPTY_FORM)
  const [nuevoAnexo, setNuevoAnexo] = useState("")
  const [loading,    setLoading]    = useState(false)
  const [showEdad,   setShowEdad]   = useState(false)

  const [areas,        setAreas]        = useState<BackendArea[]>([])
  const [loadingAreas, setLoadingAreas] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingAreas(true)
    areasApi
      .getAll()
      .then((data) => setAreas(data))
      .catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las áreas" }))
      .finally(() => setLoadingAreas(false))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(
    <K extends keyof CreateOcupacionPayload>(key: K, val: CreateOcupacionPayload[K]) =>
      setForm((p) => ({ ...p, [key]: val })),
    [],
  )

  const toggleArea = (id: number) => {
    const ids = form.areaIds
    set("areaIds", ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  }

  const agregarAnexo = () => {
    const url = nuevoAnexo.trim()
    if (!url) return
    try { new URL(url) } catch {
      toast({ variant: "destructive", title: "URL inválida", description: "Ingresá una URL con http/https" })
      return
    }
    if ((form.anexos ?? []).includes(url)) {
      toast({ variant: "destructive", title: "Duplicado", description: "Esa URL ya fue agregada" })
      return
    }
    set("anexos", [...(form.anexos ?? []), url])
    setNuevoAnexo("")
  }

  const quitarAnexo = (i: number) =>
    set("anexos", (form.anexos ?? []).filter((_, idx) => idx !== i))

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, fechaDesde: hoy(), fechaHasta: hoy() })
    setNuevoAnexo("")
    setShowEdad(false)
  }

  const handleSubmit = async () => {
    // Validaciones
    if (!form.titulo.trim())        return toast({ variant: "destructive", title: "Requerido", description: "Ingresá un título" })
    if (!form.requerimiento.trim()) return toast({ variant: "destructive", title: "Requerido", description: "Ingresá el requerimiento" })
    if (!form.organizador.trim())   return toast({ variant: "destructive", title: "Requerido", description: "Ingresá el organizador" })
    if (!form.fechaDesde)           return toast({ variant: "destructive", title: "Requerido", description: "Seleccioná la fecha de inicio" })
    if (!form.fechaHasta)           return toast({ variant: "destructive", title: "Requerido", description: "Seleccioná la fecha de fin" })
    if (!form.horaDesde)            return toast({ variant: "destructive", title: "Requerido", description: "Ingresá la hora de inicio" })
    if (!form.horaHasta)            return toast({ variant: "destructive", title: "Requerido", description: "Ingresá la hora de fin" })
    if (form.cantidadPersonas < 1)  return toast({ variant: "destructive", title: "Inválido",  description: "Mínimo 1 persona" })
    if (form.areaIds.length === 0)  return toast({ variant: "destructive", title: "Requerido", description: "Seleccioná al menos un área" })

    if (form.fechaDesde > form.fechaHasta) {
      return toast({ variant: "destructive", title: "Fecha inválida", description: "La fecha de inicio no puede ser posterior a la de fin" })
    }
    if (form.fechaDesde === form.fechaHasta && form.horaDesde >= form.horaHasta) {
      return toast({ variant: "destructive", title: "Hora inválida", description: "La hora de inicio debe ser anterior a la de fin" })
    }
    if (form.edadMin !== undefined && form.edadMax !== undefined && form.edadMin > form.edadMax) {
      return toast({ variant: "destructive", title: "Rango inválido", description: "La edad mínima no puede superar la máxima" })
    }

    try {
      setLoading(true)
      const payload: CreateOcupacionPayload = {
        titulo:           form.titulo.trim(),
        requerimiento:    form.requerimiento.trim(),
        cantidadPersonas: Number(form.cantidadPersonas),
        organizador:      form.organizador.trim(),
        fechaDesde:       form.fechaDesde,
        fechaHasta:       form.fechaHasta,
        horaDesde:        form.horaDesde,
        horaHasta:        form.horaHasta,
        areaIds:          form.areaIds,
        anexos:           form.anexos ?? [],
        ...(form.edadMin !== undefined && { edadMin: Number(form.edadMin) }),
        ...(form.edadMax !== undefined && { edadMax: Number(form.edadMax) }),
      }

      await ocupacionesApi.create(payload)

      toast({
        title:       "✅ Ocupación agendada",
        description: `"${payload.titulo}" registrada — áreas marcadas como ocupadas`,
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Error desconocido"
      // El backend devuelve el mensaje de conflicto en el body
      const msg = raw.includes("Conflicto")
        ? raw.replace("Error al crear ocupación: ", "").replace(/^\{"message":"/, "").replace(/".*$/, "")
        : raw
      toast({ variant: "destructive", title: "Error al agendar", description: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Agendar Ocupación
          </DialogTitle>
          <DialogDescription>
            Completá los datos y seleccioná las áreas a ocupar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Título */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5" /> Título
            </Label>
            <Input
              placeholder="Ej: Reunión de equipo"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
            />
          </div>

          {/* Organizador */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="w-3.5 h-3.5" /> Organizador
            </Label>
            <Input
              placeholder="Nombre del responsable"
              value={form.organizador}
              onChange={(e) => set("organizador", e.target.value)}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-3.5 h-3.5" /> Fecha inicio
              </Label>
              <Input
                type="date"
                min={hoy()}
                value={form.fechaDesde}
                onChange={(e) => {
                  set("fechaDesde", e.target.value)
                  if (e.target.value > form.fechaHasta) set("fechaHasta", e.target.value)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-3.5 h-3.5" /> Fecha fin
              </Label>
              <Input
                type="date"
                min={form.fechaDesde || hoy()}
                value={form.fechaHasta}
                onChange={(e) => set("fechaHasta", e.target.value)}
              />
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" /> Hora inicio
              </Label>
              <Input
                type="time"
                value={form.horaDesde}
                onChange={(e) => set("horaDesde", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" /> Hora fin
              </Label>
              <Input
                type="time"
                value={form.horaHasta}
                onChange={(e) => set("horaHasta", e.target.value)}
              />
            </div>
          </div>

          {/* Personas */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Users className="w-3.5 h-3.5" /> Cantidad de personas
            </Label>
            <Input
              type="number"
              min={1}
              value={form.cantidadPersonas}
              onChange={(e) => set("cantidadPersonas", Number(e.target.value))}
            />
          </div>

          {/* Requerimiento */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5" /> Requerimientos
            </Label>
            <Textarea
              placeholder="Descripción o necesidades especiales"
              rows={3}
              value={form.requerimiento}
              onChange={(e) => set("requerimiento", e.target.value)}
            />
          </div>

          {/* Áreas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" /> Áreas a ocupar
            </Label>
            {loadingAreas ? (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Cargando áreas...</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {areas.map((area) => {
                  const sel = form.areaIds.includes(area.id)
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        sel
                          ? "bg-primary text-primary-foreground border-primary"
                          : area.estado === "OCUPADO"
                            ? "bg-red-50 text-red-500 border-red-200 opacity-60 cursor-not-allowed"
                            : "bg-muted/40 hover:bg-muted border-border"
                      }`}
                      disabled={area.estado === "OCUPADO" && !sel}
                    >
                      {sel && <CheckSquare className="w-3.5 h-3.5" />}
                      <span>{area.nombre}</span>
                      {area.estado === "OCUPADO" && !sel && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">Ocupada</Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Edad opcional */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEdad(!showEdad)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <span>Rango de edad (opcional)</span>
              {showEdad ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showEdad && (
              <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs">Edad mínima</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="0"
                    value={form.edadMin ?? ""}
                    onChange={(e) => set("edadMin", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Edad máxima</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="120"
                    value={form.edadMax ?? ""}
                    onChange={(e) => set("edadMax", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Anexos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="w-3.5 h-3.5" /> Anexos (URLs, opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={nuevoAnexo}
                onChange={(e) => setNuevoAnexo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarAnexo())}
              />
              <Button type="button" variant="outline" size="icon" onClick={agregarAnexo}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {(form.anexos ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(form.anexos ?? []).map((url, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate flex-1">{url}</span>
                    <button type="button" onClick={() => quitarAnexo(i)}>
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Agendando...</> : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
