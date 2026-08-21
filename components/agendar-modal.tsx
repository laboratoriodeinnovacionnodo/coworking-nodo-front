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

// ── tipos internos ───────────────────────────────────────────────────────────
interface AgendarModalProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:  () => void
}

const EMPTY_FORM: CreateOcupacionPayload = {
  titulo:           "",
  requerimiento:    "",
  cantidadPersonas: 1,
  organizador:      "",
  dia:              "",
  hora:             "",
  edadMin:          undefined,
  edadMax:          undefined,
  anexos:           [],
  areaIds:          [],
}

// ── componente ───────────────────────────────────────────────────────────────
export function AgendarModal({ open, onOpenChange, onSuccess }: AgendarModalProps) {
  const { toast } = useToast()

  const [form,       setForm]       = useState<CreateOcupacionPayload>(EMPTY_FORM)
  const [nuevoAnexo, setNuevoAnexo] = useState("")
  const [loading,    setLoading]    = useState(false)
  const [showEdad,   setShowEdad]   = useState(false)

  // áreas del coworking disponibles
  const [areas,        setAreas]        = useState<BackendArea[]>([])
  const [loadingAreas, setLoadingAreas] = useState(false)

  // ── cargar áreas cuando se abre el modal ───────────────────────────────
  useEffect(() => {
    if (!open) return
    setLoadingAreas(true)
    areasApi
      .getAll()
      .then((data) => setAreas(data))
      .catch(() =>
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las áreas" }),
      )
      .finally(() => setLoadingAreas(false))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── helpers ────────────────────────────────────────────────────────────
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
    setForm(EMPTY_FORM)
    setNuevoAnexo("")
    setShowEdad(false)
  }

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.titulo.trim())        { toast({ variant: "destructive", title: "Requerido", description: "Ingresá un título" });            return }
    if (!form.requerimiento.trim()) { toast({ variant: "destructive", title: "Requerido", description: "Ingresá el requerimiento" });     return }
    if (!form.organizador.trim())   { toast({ variant: "destructive", title: "Requerido", description: "Ingresá el organizador" });       return }
    if (!form.dia)                  { toast({ variant: "destructive", title: "Requerido", description: "Seleccioná una fecha" });         return }
    if (!form.hora)                 { toast({ variant: "destructive", title: "Requerido", description: "Ingresá una hora" });             return }
    if (form.cantidadPersonas < 1)  { toast({ variant: "destructive", title: "Inválido",  description: "Mínimo 1 persona" });             return }
    if (form.areaIds.length === 0)  { toast({ variant: "destructive", title: "Requerido", description: "Seleccioná al menos un área" }); return }

    if (
      form.edadMin !== undefined &&
      form.edadMax !== undefined &&
      form.edadMin > form.edadMax
    ) {
      toast({ variant: "destructive", title: "Rango inválido", description: "La edad mínima no puede superar la máxima" })
      return
    }

    try {
      setLoading(true)
      const payload: CreateOcupacionPayload = {
        titulo:           form.titulo.trim(),
        requerimiento:    form.requerimiento.trim(),
        cantidadPersonas: Number(form.cantidadPersonas),
        organizador:      form.organizador.trim(),
        dia:              form.dia,
        hora:             form.hora,
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
      const msg = err instanceof Error ? err.message : "Error desconocido"
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

  // ── UI ─────────────────────────────────────────────────────────────────
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
            <Label htmlFor="oc-titulo" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5 text-primary" /> Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="oc-titulo"
              placeholder="Ej: Taller de programación"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              disabled={loading}
              maxLength={120}
            />
          </div>

          {/* Requerimiento */}
          <div className="space-y-1.5">
            <Label htmlFor="oc-req" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5 text-primary" /> Requerimiento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="oc-req"
              placeholder="Equipamiento, condiciones, necesidades especiales..."
              value={form.requerimiento}
              onChange={(e) => set("requerimiento", e.target.value)}
              disabled={loading}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Organizador */}
          <div className="space-y-1.5">
            <Label htmlFor="oc-org" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="w-3.5 h-3.5 text-primary" /> Solicitante / Organizador <span className="text-destructive">*</span>
            </Label>
            <Input
              id="oc-org"
              placeholder="Nombre completo o institución"
              value={form.organizador}
              onChange={(e) => set("organizador", e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Cantidad de personas */}
          <div className="space-y-1.5">
            <Label htmlFor="oc-cant" className="flex items-center gap-1.5 text-sm font-medium">
              <Users className="w-3.5 h-3.5 text-primary" /> Cantidad de personas <span className="text-destructive">*</span>
            </Label>
            <Input
              id="oc-cant"
              type="number"
              min={1}
              max={9999}
              placeholder="Ej: 30"
              value={form.cantidadPersonas}
              onChange={(e) => set("cantidadPersonas", parseInt(e.target.value) || 1)}
              disabled={loading}
            />
          </div>

          {/* Día y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oc-dia" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-3.5 h-3.5 text-primary" /> Día <span className="text-destructive">*</span>
              </Label>
              <Input
                id="oc-dia"
                type="date"
                value={form.dia}
                onChange={(e) => set("dia", e.target.value)}
                disabled={loading}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oc-hora" className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-3.5 h-3.5 text-primary" /> Hora <span className="text-destructive">*</span>
              </Label>
              <Input
                id="oc-hora"
                type="time"
                value={form.hora}
                onChange={(e) => set("hora", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Selector de áreas ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Áreas del coworking <span className="text-destructive">*</span>
            </Label>

            {loadingAreas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando áreas...
              </div>
            ) : areas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No hay áreas disponibles</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {areas.map((area) => {
                  const selected = form.areaIds.includes(area.id)
                  const libre    = area.estado === "LIBRE"
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => libre && toggleArea(area.id)}
                      disabled={loading || !libre}
                      className={[
                        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : libre
                            ? "border-border hover:border-primary/50 hover:bg-muted/40"
                            : "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60",
                      ].join(" ")}
                    >
                      <CheckSquare
                        className={[
                          "w-4 h-4 mt-0.5 flex-shrink-0 transition-colors",
                          selected ? "text-primary" : "text-muted-foreground/50",
                        ].join(" ")}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium block truncate">{area.nombre}</span>
                        {area.descripcion && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {area.descripcion}
                          </span>
                        )}
                        {!libre && (
                          <span className="text-xs text-destructive font-medium">Ocupada</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* badges de áreas seleccionadas */}
            {form.areaIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.areaIds.map((id) => {
                  const area = areas.find((a) => a.id === id)
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1 pr-1 text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      {area?.nombre ?? `Área ${id}`}
                      <button
                        type="button"
                        onClick={() => toggleArea(id)}
                        disabled={loading}
                        className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rango de edad (colapsable) ──────────────────────────────────── */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEdad(!showEdad)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Rango de edad del público
                <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </span>
              {showEdad
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showEdad && (
              <div className="px-4 py-4 grid grid-cols-2 gap-3 bg-background">
                <div className="space-y-1.5">
                  <Label htmlFor="oc-emin" className="text-xs font-medium text-muted-foreground">Edad mínima</Label>
                  <Input
                    id="oc-emin"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Ej: 10"
                    value={form.edadMin ?? ""}
                    onChange={(e) => set("edadMin", e.target.value ? parseInt(e.target.value) : undefined)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="oc-emax" className="text-xs font-medium text-muted-foreground">Edad máxima</Label>
                  <Input
                    id="oc-emax"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Ej: 20"
                    value={form.edadMax ?? ""}
                    onChange={(e) => set("edadMax", e.target.value ? parseInt(e.target.value) : undefined)}
                    disabled={loading}
                  />
                </div>
                {form.edadMin !== undefined && form.edadMax !== undefined && form.edadMin <= form.edadMax && (
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Público de <strong>{form.edadMin}</strong> a <strong>{form.edadMax}</strong> años
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Anexos ──────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              Anexos
              <span className="text-xs text-muted-foreground font-normal">(opcional — máx. 10 URLs)</span>
            </Label>

            {(form.anexos ?? []).length > 0 && (
              <ul className="space-y-1.5">
                {(form.anexos ?? []).map((url, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-3 py-2 group">
                    <Link2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       className="flex-1 truncate text-primary hover:underline">
                      {url}
                    </a>
                    <button
                      type="button"
                      onClick={() => quitarAnexo(i)}
                      disabled={loading}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {(form.anexos ?? []).length < 10 && (
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={nuevoAnexo}
                  onChange={(e) => setNuevoAnexo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarAnexo())}
                  disabled={loading}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={agregarAnexo}
                  disabled={loading || !nuevoAnexo.trim()}
                  className="flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="bg-transparent">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <><CalendarDays className="w-4 h-4" /> Agendar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
