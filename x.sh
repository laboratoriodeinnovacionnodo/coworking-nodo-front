#!/usr/bin/env bash
# =============================================================================
# v5-front-ocupacion-fechas.sh — v1.0.0 — PRODUCCIÓN (coworking-front)
#
# Cambios:
#  · types/ocupacion.ts     → reemplaza dia/hora por fechaDesde/fechaHasta/horaDesde/horaHasta
#  · lib/ocupacion-api.ts   → agrega getActivas()
#  · components/agendar-modal.tsx → inputs fecha/hora nuevos + validación conflicto via API
#  · components/disponibilidad-inline.tsx → usa /activas, muestra rango de fechas y horario
# =============================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  v5-front-ocupacion-fechas.sh — v1.0.0                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz del proyecto Next.js"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# 1. types/ocupacion.ts
# ════════════════════════════════════════════════════════════════════════════
echo "📄  types/ocupacion.ts..."
cat > types/ocupacion.ts << 'EOF'
import type { BackendArea } from "@/types/seat"

export interface OcupacionArea {
  ocupacionId: number
  areaId:      number
  area:        BackendArea
}

export interface Ocupacion {
  id:               number
  titulo:           string
  requerimiento:    string
  cantidadPersonas: number
  organizador:      string
  // Nuevos campos — reemplaza dia + hora
  fechaDesde:       string   // ISO: "2026-08-25T00:00:00.000Z"
  fechaHasta:       string   // ISO: "2026-08-25T23:59:59.000Z"
  horaDesde:        string   // "HH:mm"
  horaHasta:        string   // "HH:mm"
  edadMin?:         number | null
  edadMax?:         number | null
  anexos:           string[]
  liberadaAt?:      string | null
  areas:            OcupacionArea[]
  createdAt:        string
  updatedAt:        string
}

export interface CreateOcupacionPayload {
  titulo:           string
  requerimiento:    string
  cantidadPersonas: number
  organizador:      string
  fechaDesde:       string   // "YYYY-MM-DD"
  fechaHasta:       string   // "YYYY-MM-DD"
  horaDesde:        string   // "HH:mm"
  horaHasta:        string   // "HH:mm"
  edadMin?:         number
  edadMax?:         number
  anexos?:          string[]
  areaIds:          number[]
}
EOF
echo "✅  types/ocupacion.ts"

# ════════════════════════════════════════════════════════════════════════════
# 2. lib/ocupacion-api.ts — agrega getActivas
# ════════════════════════════════════════════════════════════════════════════
echo "📄  lib/ocupacion-api.ts..."
cat > lib/ocupacion-api.ts << 'EOF'
import type { Ocupacion, CreateOcupacionPayload } from "@/types/ocupacion"

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"

export const ocupacionesApi = {
  getAll: async (): Promise<Ocupacion[]> => {
    const res = await fetch(`${BASE}/ocupaciones`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Error al obtener ocupaciones: ${res.status}`)
    return res.json()
  },

  // Solo activas desde hoy (usa el nuevo endpoint del backend)
  getActivas: async (): Promise<Ocupacion[]> => {
    const res = await fetch(`${BASE}/ocupaciones/activas`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Error al obtener ocupaciones activas: ${res.status}`)
    return res.json()
  },

  getById: async (id: number): Promise<Ocupacion> => {
    const res = await fetch(`${BASE}/ocupaciones/${id}`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) throw new Error(`Error al obtener ocupación ${id}`)
    return res.json()
  },

  create: async (data: CreateOcupacionPayload): Promise<Ocupacion> => {
    const res = await fetch(`${BASE}/ocupaciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Error al crear ocupación: ${body}`)
    }
    return res.json()
  },

  liberar: async (id: number): Promise<Ocupacion> => {
    const res = await fetch(`${BASE}/ocupaciones/${id}/liberar`, { method: "PATCH" })
    if (!res.ok) throw new Error(`Error al liberar ocupación ${id}`)
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE}/ocupaciones/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error(`Error al eliminar ocupación ${id}`)
  },
}
EOF
echo "✅  lib/ocupacion-api.ts"

# ════════════════════════════════════════════════════════════════════════════
# 3. components/agendar-modal.tsx — inputs fecha/hora nuevos
# ════════════════════════════════════════════════════════════════════════════
echo "📄  components/agendar-modal.tsx..."
cat > components/agendar-modal.tsx << 'EOF'
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
EOF
echo "✅  components/agendar-modal.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 4. components/disponibilidad-inline.tsx — usa getActivas, muestra rango
# ════════════════════════════════════════════════════════════════════════════
echo "📄  components/disponibilidad-inline.tsx..."
cat > components/disponibilidad-inline.tsx << 'EOF'
"use client"

import { useState, useEffect, useCallback } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import {
  Loader2,
  MapPin,
  Clock,
  Users,
  Unlock,
  RefreshCw,
  Inbox,
  Link2,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DisponibilidadInlineProps {
  onSuccess?: () => void
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  })
}

function esHoy(iso: string): boolean {
  const hoy = new Date()
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  const f = new Date(y, m - 1, d)
  return f.getDate() === hoy.getDate() && f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
}

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(false)
  const [liberando,   setLiberando]   = useState<number | null>(null)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      // Usa el endpoint /activas — solo las vigentes desde hoy
      const data = await ocupacionesApi.getActivas()
      setOcupaciones(data)
    } catch {
      if (!silencioso) toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [toast])

  useEffect(() => { cargar() }, [cargar])

  const liberar = async (oc: Ocupacion) => {
    setLiberando(oc.id)
    try {
      await ocupacionesApi.liberar(oc.id)
      toast({ title: "✅ Zonas liberadas", description: `"${oc.titulo}" finalizada` })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Error" })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id)

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando ocupaciones...</span>
      </div>
    )
  }

  if (ocupaciones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Inbox className="w-7 h-7 opacity-50" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Sin ocupaciones activas</p>
          <p className="text-xs opacity-60 mt-0.5">Todas las áreas están disponibles</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => cargar()} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">
            {ocupaciones.length} ocupación{ocupaciones.length !== 1 ? "es" : ""} activa{ocupaciones.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            · {ocupaciones.reduce((a, o) => a + o.areas.length, 0)} zona{ocupaciones.reduce((a, o) => a + o.areas.length, 0) !== 1 ? "s" : ""} ocupada{ocupaciones.reduce((a, o) => a + o.areas.length, 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cargar()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {ocupaciones.map((oc) => {
          const hoy      = esHoy(oc.fechaDesde)
          const multidia = oc.fechaDesde.split("T")[0] !== oc.fechaHasta.split("T")[0]
          const expanded = expandedId === oc.id

          return (
            <div
              key={oc.id}
              className={cn(
                "rounded-xl border border-l-4 border-l-primary bg-white shadow-sm overflow-hidden",
                hoy && "ring-1 ring-primary/20",
              )}
            >
              {/* Header clickeable */}
              <button
                type="button"
                onClick={() => toggleExpand(oc.id)}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{oc.titulo}</p>
                    {hoy && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {formatFecha(oc.fechaDesde)}
                      {multidia && <> → {formatFecha(oc.fechaHasta)}</>}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {oc.horaDesde} – {oc.horaHasta}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {oc.cantidadPersonas} personas
                    </span>
                  </div>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />}
              </button>

              {/* Detalle expandible */}
              {expanded && (
                <div className="border-t px-4 py-3 space-y-3 bg-muted/10">
                  {/* Organizador */}
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Organizador:</span>
                    <span className="font-medium text-foreground">{oc.organizador}</span>
                  </div>

                  {/* Áreas */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> Áreas ocupadas:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {oc.areas.length > 0
                        ? oc.areas.map((r) => (
                            <Badge key={r.areaId} variant="secondary" className="text-xs">
                              {r.area.nombre}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">Sin zonas</span>
                      }
                    </div>
                  </div>

                  {/* Requerimiento */}
                  {oc.requerimiento && (
                    <p className="text-xs text-muted-foreground border-t pt-2">{oc.requerimiento}</p>
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
    </div>
  )
}
EOF
echo "✅  components/disponibilidad-inline.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 5. Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v5-front-ocupacion-fechas.sh — v1.0.0 completado           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Cambios aplicados:"
echo "  · types/ocupacion.ts     → fechaDesde/fechaHasta/horaDesde/horaHasta"
echo "  · lib/ocupacion-api.ts   → getActivas() usa /ocupaciones/activas"
echo "  · agendar-modal.tsx      → 2 date pickers + 2 time pickers"
echo "  · disponibilidad-inline  → cards con rango fecha/hora expandibles"
echo ""