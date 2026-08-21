#!/usr/bin/env bash
# =============================================================================
# front-disponibilidad.sh  —  v1.0.0  —  PRODUCCIÓN
#
# Cambios:
#  1. Nuevo componente: tabla de ocupaciones activas con botón "Liberar zona"
#  2. Nuevo componente: modal solo-lectura con el mapa SVG del coworking
#  3. Dos botones en el header: "Disponibilidad" y "Mapa"
#  4. Elimina el SeatStatusModal del mapa (modal de zonas al clickear)
#  5. Limpia estados obsoletos: out-of-service, cleaning, for-share, shared
#     de types/seat.ts, lib/api.ts, lib/seat-utils.ts, app/globals.css,
#     components/seat-legend.tsx, components/seat-grid.tsx
# =============================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  front-disponibilidad.sh — v1.0.0                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ════════════════════════════════════════════════════════════════
# 1. types/seat.ts — solo LIBRE y OCUPADO
# ════════════════════════════════════════════════════════════════
cat > types/seat.ts << 'EOF'
export type SeatStatus =
  | "available"  // LIBRE
  | "occupied"   // OCUPADO

export interface Seat {
  id:         string
  backendId?: number
  row:        string
  number:     number
  status:     SeatStatus
  userName?:  string
  occupiedAt?: Date
  peopleCount?: number
  image?:     string
  capacity?:  number
  zone?:      string
  amenities?: string[]
  mapPdfUrl?: string
}

export interface SeatArea {
  id:         string
  name:       string
  seats:      Seat[]
  isBlocked:  boolean
  eventName?: string
}

export interface BackendUsuario {
  id:        number
  nombre:    string
  email:     string
  reservas?: BackendReserva[]
  createdAt: string
}

export interface BackendAdmin {
  id:        number
  nombre:    string
  email:     string
  password:  string
  createdAt: string
}

export interface BackendArea {
  id:          number
  nombre:      string
  descripcion: string | null
  estado:      "LIBRE" | "OCUPADO"
  reservas?:   BackendReserva[]
  createdAt:   string
}

export interface BackendReserva {
  id:        number
  nombre:    string
  detalles:  string | null
  usuario?:  BackendUsuario
  usuarioId: number
  area?:     BackendArea
  areaId:    number
  inicio:    string
  fin:       string | null
  createdAt: string
}
EOF
echo "✅  types/seat.ts — estados simplificados"

# ════════════════════════════════════════════════════════════════
# 2. lib/api.ts — mapa de estados limpio
# ════════════════════════════════════════════════════════════════
cat > lib/api.ts << 'EOF'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"

import type { BackendArea, BackendReserva, BackendUsuario, BackendAdmin } from "@/types/seat"

const statusMap: Record<string, string> = {
  available: "LIBRE",
  occupied:  "OCUPADO",
}

const reverseStatusMap: Record<string, string> = {
  LIBRE:   "available",
  OCUPADO: "occupied",
}

export const usuariosApi = {
  getAll: async (): Promise<BackendUsuario[]> => {
    const res = await fetch(`${API_BASE_URL}/usuario`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener usuarios")
    return res.json()
  },
  getById: async (id: number): Promise<BackendUsuario> => {
    const res = await fetch(`${API_BASE_URL}/usuario/${id}`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener usuario")
    return res.json()
  },
  create: async (data: { nombre: string; email: string }): Promise<BackendUsuario> => {
    const res = await fetch(`${API_BASE_URL}/usuario`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear usuario")
    return res.json()
  },
  update: async (id: number, data: Partial<{ nombre: string; email: string }>): Promise<BackendUsuario> => {
    const res = await fetch(`${API_BASE_URL}/usuario/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar usuario")
    return res.json()
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/usuario/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar usuario")
  },
}

export const areasApi = {
  getAll: async (): Promise<BackendArea[]> => {
    const res = await fetch(`${API_BASE_URL}/areas`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  getById: async (id: number): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener área")
    return res.json()
  },
  create: async (data: { nombre: string; descripcion?: string; estado?: string }): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear área")
    return res.json()
  },
  update: async (id: number, data: Partial<BackendArea>): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar área")
    return res.json()
  },
  cambiarEstado: async (id: number, estado: string): Promise<BackendArea> => {
    const backendEstado = statusMap[estado] || estado
    const res = await fetch(`${API_BASE_URL}/areas/${id}/estado/${backendEstado}`, { method: "PATCH" })
    if (!res.ok) throw new Error("Error al cambiar estado")
    return res.json()
  },
  bloquearTodas: async (bloquear: boolean): Promise<BackendArea[]> => {
    const estado = bloquear ? "OCUPADO" : "LIBRE"
    const areas = await areasApi.getAll()
    const results = await Promise.all(
      areas.map((area) =>
        fetch(`${API_BASE_URL}/areas/${area.id}/estado/${estado}`, { method: "PATCH" }).then((r) => {
          if (!r.ok) throw new Error(`Error al actualizar área ${area.id}`)
          return r.json()
        }),
      ),
    )
    return results
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar área")
  },
}

export const reservasApi = {
  getAll: async (): Promise<BackendReserva[]> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener reservas")
    return res.json()
  },
  getById: async (id: number): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener reserva")
    return res.json()
  },
  create: async (data: { nombre: string; detalles?: string; usuarioId: number; areaId: number }): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(`Error al crear reserva: ${e}`) }
    return res.json()
  },
  update: async (id: number, data: Partial<BackendReserva>): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar reserva")
    return res.json()
  },
  completar: async (id: number): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}/completar`, { method: "PATCH" })
    if (!res.ok) throw new Error("Error al completar reserva")
    return res.json()
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar reserva")
  },
}

export const adminsApi = {
  login: async (email: string, password: string): Promise<BackendAdmin> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(e || "Credenciales inválidas") }
    return res.json()
  },
  getAll: async (): Promise<BackendAdmin[]> => {
    const res = await fetch(`${API_BASE_URL}/admin`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener administradores")
    return res.json()
  },
  create: async (data: { nombre: string; email: string; password: string }): Promise<BackendAdmin> => {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear administrador")
    return res.json()
  },
}

export const convertBackendAreaToSeat = (area: BackendArea, reservas: BackendReserva[]) => {
  const activeReservas = reservas.filter((r) => r.areaId === area.id && r.fin === null)

  let row = ""
  let number = 0
  const match = area.nombre.match(/^([A-Z])(\d+)$/)
  if (match) {
    row = match[1]
    number = parseInt(match[2])
  } else {
    row = String.fromCharCode(65 + Math.floor((area.id - 1) / 10))
    number = ((area.id - 1) % 10) + 1
  }

  return {
    id:         area.nombre,
    backendId:  area.id,
    row,
    number,
    status:     (reverseStatusMap[area.estado] || "available") as "available" | "occupied",
    userName:   activeReservas[0]?.nombre,
    occupiedAt: activeReservas[0]?.inicio ? new Date(activeReservas[0].inicio) : undefined,
    peopleCount: activeReservas.length,
    image:      `/placeholder.svg?height=300&width=400`,
    capacity:   2,
    zone:       area.descripcion || "Zona Principal",
    amenities:  ['Monitor 24"', "Enchufe USB-C", "Iluminación LED"],
    mapPdfUrl:  "/coworking-map.pdf",
  }
}

export { statusMap, reverseStatusMap }
EOF
echo "✅  lib/api.ts — estados limpiados"

# ════════════════════════════════════════════════════════════════
# 3. lib/seat-utils.ts — solo available y occupied
# ════════════════════════════════════════════════════════════════
cat > lib/seat-utils.ts << 'EOF'
import type { SeatStatus } from "@/types/seat"

export const seatStatusColors: Record<SeatStatus, string> = {
  available: "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200",
  occupied:  "bg-red-100   text-red-800   border border-red-300   hover:bg-red-200",
}

export const seatStatusLabel: Record<SeatStatus, string> = {
  available: "Libre",
  occupied:  "Ocupado",
}
EOF
echo "✅  lib/seat-utils.ts — estados limpiados"

# ════════════════════════════════════════════════════════════════
# 4. app/globals.css — quitar variables de estados obsoletos
# ════════════════════════════════════════════════════════════════
# Elimina líneas de variables CSS de estados que ya no existen
sed -i '/--seat-out-of-service/d' app/globals.css
sed -i '/--seat-cleaning/d'       app/globals.css
sed -i '/--seat-for-share/d'      app/globals.css
sed -i '/--seat-shared/d'         app/globals.css
echo "✅  app/globals.css — variables obsoletas eliminadas"

# ════════════════════════════════════════════════════════════════
# 5. components/seat-legend.tsx — solo LIBRE y OCUPADO
# ════════════════════════════════════════════════════════════════
cat > components/seat-legend.tsx << 'EOF'
"use client"

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0" />
        <span className="text-muted-foreground">Libre</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0" />
        <span className="text-muted-foreground">Ocupado</span>
      </div>
    </div>
  )
}
EOF
echo "✅  components/seat-legend.tsx — limpiado"

# ════════════════════════════════════════════════════════════════
# 6. components/seat-grid.tsx — sin modal al clickear (display only)
# ════════════════════════════════════════════════════════════════
cat > components/seat-grid.tsx << 'EOF'
"use client"

import type { Seat } from "@/types/seat"
import { seatStatusColors } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"
import { Armchair } from "lucide-react"

interface SeatGridProps {
  seats:       Seat[]
  isBlocked?:  boolean
}

export function SeatGrid({ seats, isBlocked }: SeatGridProps) {
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = []
      acc[seat.row].push(seat)
      return acc
    },
    {} as Record<string, Seat[]>,
  )

  const rows = Object.keys(seatsByRow).sort()

  return (
    <div className="space-y-3 md:space-y-4">
      {rows.map((row) => (
        <div key={row} className="flex items-start gap-2 md:gap-3">
          <div className="w-6 md:w-8 text-xs md:text-sm font-medium text-muted-foreground pt-2 flex-shrink-0">
            {row}
          </div>
          <div className="flex gap-2 md:gap-3 flex-wrap flex-1">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <div
                  key={seat.id}
                  title={`${seat.id} — ${seat.status === "available" ? "Libre" : "Ocupado"}`}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg transition-all",
                    seatStatusColors[seat.status],
                    isBlocked && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Armchair className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs font-bold mt-0.5">{seat.number}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
EOF
echo "✅  components/seat-grid.tsx — modal de zona eliminado"

# ════════════════════════════════════════════════════════════════
# 7. components/disponibilidad-tabla.tsx — tabla de ocupaciones activas
# ════════════════════════════════════════════════════════════════
cat > components/disponibilidad-tabla.tsx << 'EOF'
"use client"

import { useState, useEffect, useCallback } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Unlock,
  RefreshCw,
  Inbox,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface DisponibilidadTablaProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

export function DisponibilidadTabla({ open, onOpenChange, onSuccess }: DisponibilidadTablaProps) {
  const { toast } = useToast()
  const [ocupaciones,  setOcupaciones]  = useState<Ocupacion[]>([])
  const [loading,      setLoading]      = useState(false)
  const [liberando,    setLiberando]    = useState<number | null>(null)
  const [expandedId,   setExpandedId]   = useState<number | null>(null)

  // ── Carga ────────────────────────────────────────────────────
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const data = await ocupacionesApi.getAll()
      // Solo las activas (sin liberadaAt)
      setOcupaciones(data.filter((o) => !o.liberadaAt))
    } catch {
      if (!silencioso) toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) cargar()
  }, [open, cargar])

  // ── Liberar ──────────────────────────────────────────────────
  const liberar = async (ocupacion: Ocupacion) => {
    setLiberando(ocupacion.id)
    try {
      await ocupacionesApi.liberar(ocupacion.id)
      toast({
        title: "✅ Zonas liberadas",
        description: `"${ocupacion.titulo}" finalizada — áreas marcadas como LIBRE`,
      })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al liberar", description: msg })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id)

  // ── Helpers ──────────────────────────────────────────────────
  const formatFecha = (dia: string, hora: string) => {
    try {
      const [y, m, d] = dia.split("-")
      return `${d}/${m}/${y} ${hora}`
    } catch {
      return `${dia} ${hora}`
    }
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Disponibilidad de Zonas
              </DialogTitle>
              <DialogDescription>
                Ocupaciones activas — liberá zonas cuando terminen
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => cargar()}
              disabled={loading}
              className="flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando ocupaciones...</span>
            </div>
          ) : ocupaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Inbox className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No hay zonas ocupadas en este momento</p>
              <p className="text-xs opacity-60">Todas las áreas están disponibles</p>
            </div>
          ) : (
            <>
              {/* ── Desktop: tabla ─────────────────────────────── */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Organizador</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Fecha / Hora</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Personas</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Zonas</span>
                      </TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocupaciones.map((oc) => (
                      <>
                        <TableRow
                          key={oc.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleExpand(oc.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {expandedId === oc.id
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                              {oc.titulo}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{oc.organizador}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {formatFecha(oc.dia, oc.hora)}
                            </span>
                          </TableCell>
                          <TableCell>{oc.cantidadPersonas}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {oc.areas.length > 0
                                ? oc.areas.map((r) => (
                                    <Badge key={r.areaId} variant="secondary" className="text-xs">
                                      {r.area.nombre}
                                    </Badge>
                                  ))
                                : <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs border-green-300 text-green-700 hover:bg-green-50"
                              disabled={liberando === oc.id}
                              onClick={(e) => { e.stopPropagation(); liberar(oc) }}
                            >
                              {liberando === oc.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Unlock className="w-3.5 h-3.5" />}
                              Liberar
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Fila expandida: requerimiento + rango edad + anexos */}
                        {expandedId === oc.id && (
                          <TableRow key={`exp-${oc.id}`} className="bg-muted/20">
                            <TableCell colSpan={6} className="py-3">
                              <div className="space-y-2 text-sm pl-5">
                                <p><span className="font-medium text-foreground">Requerimiento:</span>{" "}
                                  <span className="text-muted-foreground">{oc.requerimiento}</span>
                                </p>
                                {(oc.edadMin != null || oc.edadMax != null) && (
                                  <p><span className="font-medium text-foreground">Rango de edad:</span>{" "}
                                    <span className="text-muted-foreground">
                                      {oc.edadMin ?? "?"} — {oc.edadMax ?? "?"} años
                                    </span>
                                  </p>
                                )}
                                {oc.anexos.length > 0 && (
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className="font-medium text-foreground">Anexos:</span>
                                    {oc.anexos.map((url, i) => (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-primary hover:underline text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Link2 className="w-3 h-3" />
                                        Anexo {i + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile: cards ──────────────────────────────── */}
              <div className="md:hidden space-y-3 p-1">
                {ocupaciones.map((oc) => (
                  <div key={oc.id} className="border rounded-xl p-4 bg-card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{oc.titulo}</p>
                        <p className="text-xs text-muted-foreground">{oc.organizador}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs flex-shrink-0 border-green-300 text-green-700 hover:bg-green-50"
                        disabled={liberando === oc.id}
                        onClick={() => liberar(oc)}
                      >
                        {liberando === oc.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Unlock className="w-3 h-3" />}
                        Liberar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatFecha(oc.dia, oc.hora)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {oc.cantidadPersonas} personas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {oc.areas.length > 0
                        ? oc.areas.map((r) => (
                            <Badge key={r.areaId} variant="secondary" className="text-xs">
                              {r.area.nombre}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">Sin zonas asignadas</span>}
                    </div>

                    {oc.requerimiento && (
                      <p className="text-xs text-muted-foreground border-t pt-2 line-clamp-2">
                        {oc.requerimiento}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer: resumen */}
        {ocupaciones.length > 0 && (
          <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
            <span>{ocupaciones.length} ocupación{ocupaciones.length !== 1 ? "es" : ""} activa{ocupaciones.length !== 1 ? "s" : ""}</span>
            <span>
              {ocupaciones.reduce((acc, o) => acc + o.areas.length, 0)} zona{ocupaciones.reduce((acc, o) => acc + o.areas.length, 0) !== 1 ? "s" : ""} ocupada{ocupaciones.reduce((acc, o) => acc + o.areas.length, 0) !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "✅  components/disponibilidad-tabla.tsx"

# ════════════════════════════════════════════════════════════════
# 8. components/mapa-modal.tsx — solo visualización del SVG
# ════════════════════════════════════════════════════════════════
cat > components/mapa-modal.tsx << 'EOF'
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Map } from "lucide-react"

interface MapaModalProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
}

export function MapaModal({ open, onOpenChange }: MapaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Mapa del Coworking
          </DialogTitle>
          <DialogDescription>
            Plano de referencia — Planta 1
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 rounded-lg p-4 min-h-0">
          <img
            src="/NODO-PLANO-P1.svg"
            alt="Plano planta 1 del coworking"
            className="max-w-full max-h-full object-contain"
            style={{ transform: "rotate(90deg)" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "✅  components/mapa-modal.tsx"

# ════════════════════════════════════════════════════════════════
# 9. app/page.tsx — reemplazar completamente
# ════════════════════════════════════════════════════════════════
cat > app/page.tsx << 'EOF'
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Seat } from "@/types/seat"
import { useSeats } from "@/hooks/use-seats"
import { SeatGrid } from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import { AdminPanel } from "@/components/admin-panel"
import { AgendarModal } from "@/components/agendar-modal"
import { DisponibilidadTabla } from "@/components/disponibilidad-tabla"
import { MapaModal } from "@/components/mapa-modal"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  RefreshCw,
  LogOut,
  Menu,
  Armchair,
  CalendarPlus,
  MapPin,
  Map,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

export default function CoworkingSeatsPage() {
  const router = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll } = useSeats()
  const { toast } = useToast()

  const [isAdminMode,      setIsAdminMode]      = useState(false)
  const [isBlocked,        setIsBlocked]        = useState(false)
  const [eventName,        setEventName]        = useState<string>()
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false)

  // Modales
  const [agendarOpen,      setAgendarOpen]      = useState(false)
  const [disponibilidadOpen, setDisponibilidadOpen] = useState(false)
  const [mapaOpen,         setMapaOpen]         = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  const handleToggleBlock = async (block: boolean, newEventName?: string) => {
    setIsBlocked(block)
    setEventName(newEventName)
    await toggleBlockAll(block)
  }

  const handleRefresh = async () => {
    await fetchSeats()
    toast({ title: "Datos actualizados", description: "Se recargaron los datos desde el backend" })
  }

  const occupiedCount  = seats.filter((s) => s.status === "occupied").length
  const availableCount = seats.filter((s) => s.status === "available").length

  // ── Loading states ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!admin) return null

  if (loading && seats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Cargando áreas del backend...</p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 md:px-6 py-4 max-w-7xl mx-auto">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <Armchair className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestión de Espacios</h1>
                <p className="text-xs text-muted-foreground">NODO Tecnológico</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right text-sm mr-1">
                <p className="font-medium">{admin.nombre}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>

              {/* Botón Disponibilidad */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setDisponibilidadOpen(true)}
              >
                <MapPin className="w-4 h-4" />
                Disponibilidad
              </Button>

              {/* Botón Mapa */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setMapaOpen(true)}
              >
                <Map className="w-4 h-4" />
                Mapa
              </Button>

              {/* Botón Agendar */}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setAgendarOpen(true)}
              >
                <CalendarPlus className="w-4 h-4" />
                Agendar
              </Button>

              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>

              {isAdmin && (
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                  <Label htmlFor="admin-mode" className="text-xs cursor-pointer">Admin</Label>
                </div>
              )}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <Armchair className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold">Gestión de Espacios</h1>
                <p className="text-[10px] text-muted-foreground">NODO Tecnológico</p>
              </div>
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="space-y-4 pt-4">
                  <div className="pb-3 border-b">
                    <p className="font-medium">{admin.nombre}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>

                  <Button
                    className="w-full gap-2 justify-start"
                    onClick={() => { setAgendarOpen(true); setMobileMenuOpen(false) }}
                  >
                    <CalendarPlus className="w-4 h-4" /> Agendar ocupación
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                    onClick={() => { setDisponibilidadOpen(true); setMobileMenuOpen(false) }}
                  >
                    <MapPin className="w-4 h-4" /> Disponibilidad
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                    onClick={() => { setMapaOpen(true); setMobileMenuOpen(false) }}
                  >
                    <Map className="w-4 h-4" /> Ver mapa
                  </Button>

                  <Button variant="outline" className="w-full gap-2 justify-start" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4" /> Actualizar
                  </Button>

                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Switch id="admin-mode-mobile" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                      <Label htmlFor="admin-mode-mobile" className="text-sm cursor-pointer">Modo admin</Label>
                    </div>
                  )}

                  <Button variant="ghost" className="w-full gap-2 justify-start text-destructive" onClick={logout}>
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>

      {/* ── Contenido principal ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6">

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{availableCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Libres</p>
          </div>
          <div className="bg-card border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{occupiedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ocupados</p>
          </div>
        </div>

        {/* Leyenda */}
        <SeatLegend />

        {/* Admin panel */}
        {isAdminMode && isAdmin && (
          <AdminPanel
            isBlocked={isBlocked}
            eventName={eventName}
            onToggleBlock={handleToggleBlock}
          />
        )}

        {/* Grid de asientos (display only — sin modal de zona) */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SeatGrid seats={seats} isBlocked={isBlocked} />
        </div>

      </div>

      {/* ── Modales ─────────────────────────────────────────── */}
      <AgendarModal
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
        onSuccess={fetchSeats}
      />

      <DisponibilidadTabla
        open={disponibilidadOpen}
        onOpenChange={setDisponibilidadOpen}
        onSuccess={fetchSeats}
      />

      <MapaModal
        open={mapaOpen}
        onOpenChange={setMapaOpen}
      />

    </div>
  )
}
EOF
echo "✅  app/page.tsx — reescrito con 3 botones y sin modal de zona"

# ════════════════════════════════════════════════════════════════
# 10. Verificar componentes shadcn necesarios
# ════════════════════════════════════════════════════════════════
MISSING=""
[ ! -f "components/ui/table.tsx"    ] && MISSING="$MISSING table"
[ ! -f "components/ui/textarea.tsx" ] && MISSING="$MISSING textarea"
[ ! -f "components/ui/badge.tsx"    ] && MISSING="$MISSING badge"

if [ -n "$MISSING" ]; then
  echo ""
  echo "⚠️   Componentes shadcn faltantes:$MISSING"
  echo "     Instalando..."
  pnpm dlx shadcn@latest add $MISSING --yes
fi

# ════════════════════════════════════════════════════════════════
# 11. Build
# ════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  front-disponibilidad.sh completado                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Header — 3 botones:"
echo "    · Disponibilidad → tabla de ocupaciones activas + liberar"
echo "    · Mapa           → modal solo lectura con NODO-PLANO-P1.svg"
echo "    · Agendar        → formulario de nueva ocupación"
echo ""
echo "  Limpieza:"
echo "    · Estados eliminados: out-of-service, cleaning, for-share, shared"
echo "    · SeatStatusModal removido del mapa"
echo "    · types/seat.ts, lib/api.ts, seat-utils.ts, globals.css limpiados"
echo ""