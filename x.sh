#!/usr/bin/env bash
# ============================================================================
#  v31-front-gmail-reserva.sh  — coworking-front
#
#  - types/seat.ts               → agrega gmail a BackendReserva y Seat
#  - lib/api.ts                  → gmail en create/update payload +
#                                   convertBackendAreaToSeat lo propaga
#  - components/seat-status-modal.tsx → orden del form:
#                                   1. Gmail   ← nuevo, arriba
#                                   2. Nombre
#                                   3. Personas
#                                   4. Estado
#                                   5. Receptor  ← abajo
#                                   6. Turno     ← abajo
#                                   + muestra gmail en info de reserva activa
#  - components/editar-reserva-modal.tsx → campo gmail
#  - hooks/use-seats.ts          → pasa gmail al create
# ============================================================================
set -euo pipefail

[[ -f "package.json" && -d "components" ]] || { echo "❌  Corré desde la raíz de coworking-front"; exit 1; }

echo "════════════════════════════════════════════════════════"
echo "  v31-front-gmail-reserva  |  coworking-front"
echo "════════════════════════════════════════════════════════"
echo ""

# ── 1. types/seat.ts ──────────────────────────────────────────────────────────
echo "📝  Actualizando types/seat.ts..."
cat > types/seat.ts << 'EOF'
export type SeatStatus = "available" | "occupied"

export type Recepcion = "MANANA" | "INTERMEDIO" | "TARDE"

export const RECEPCION_LABELS: Record<Recepcion, string> = {
  MANANA:     "Mañana",
  INTERMEDIO: "Intermedio",
  TARDE:      "Tarde",
}

export interface Seat {
  id:           string
  backendId?:   number
  row:          string
  number:       number
  status:       SeatStatus
  userName?:    string
  gmail?:       string
  reservaId?:   number
  recepcion?:   Recepcion
  receptor?:    string
  occupiedAt?:  Date
  peopleCount?: number
  shareLimit?:  number
  sharedUsers?: string[]
  capacity?:    number
  zone?:        string
  amenities?:   string[]
  image?:       string
  mapPdfUrl?:   string
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
  nombre?:   string
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
  id:         number
  nombre:     string
  gmail?:     string | null
  detalles?:  string | null
  usuario?:   BackendUsuario
  usuarioId:  number
  area?:      BackendArea
  areaId:     number
  inicio:     string
  fin?:       string | null
  createdAt:  string
  recepcion?: Recepcion
  receptor?:  string | null
}
EOF
echo "  ✅  types/seat.ts listo"

# ── 2. lib/api.ts ─────────────────────────────────────────────────────────────
echo "📝  Actualizando lib/api.ts..."
cat > lib/api.ts << 'EOF'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"

import type { BackendArea, BackendReserva, BackendUsuario, BackendAdmin, Recepcion } from "@/types/seat"

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
    const areas  = await areasApi.getAll()
    return Promise.all(
      areas.map((area) =>
        fetch(`${API_BASE_URL}/areas/${area.id}/estado/${estado}`, { method: "PATCH" }).then((r) => {
          if (!r.ok) throw new Error(`Error al actualizar área ${area.id}`)
          return r.json()
        }),
      ),
    )
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar área")
  },
}

export interface UpdateReservaPayload {
  nombre?:    string
  gmail?:     string
  detalles?:  string
  areaId?:    number
  recepcion?: Recepcion
  receptor?:  string
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
  create: async (data: {
    nombre:     string
    gmail?:     string
    detalles?:  string
    usuarioId:  number
    areaId:     number
    recepcion?: Recepcion
    receptor?:  string
  }): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(`Error al crear reserva: ${e}`) }
    return res.json()
  },
  update: async (id: number, data: UpdateReservaPayload): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(`Error al actualizar reserva: ${e}`) }
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
  const active         = activeReservas[0]

  const match  = area.nombre.match(/^([A-Za-z]+)(\d+)$/)
  const letra  = match ? match[1].toUpperCase() : "A"
  const numero = match ? parseInt(match[2]) : area.id

  return {
    id:          area.nombre,
    backendId:   area.id,
    row:         letra,
    number:      numero,
    status:      ({ LIBRE: "available", OCUPADO: "occupied" }[area.estado] ?? "available") as "available" | "occupied",
    userName:    active?.nombre,
    gmail:       active?.gmail ?? undefined,
    reservaId:   active?.id,
    recepcion:   active?.recepcion,
    receptor:    active?.receptor ?? undefined,
    occupiedAt:  active?.inicio ? new Date(active.inicio) : undefined,
    peopleCount: activeReservas.length,
    zone:        letra,
    amenities:   area.descripcion ? [area.descripcion] : [],
    mapPdfUrl:   "/coworking-map.pdf",
  }
}

export { statusMap, reverseStatusMap }
EOF
echo "  ✅  lib/api.ts listo"

# ── 3. components/seat-status-modal.tsx ──────────────────────────────────────
echo "📝  Actualizando seat-status-modal.tsx..."
cat > components/seat-status-modal.tsx << 'EOF'
"use client"

import { useState } from "react"
import type { Seat, SeatStatus, Recepcion } from "@/types/seat"
import { RECEPCION_LABELS }                 from "@/types/seat"
import { seatStatusLabels, canOccupySeat }  from "@/lib/seat-utils"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Label }     from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Sun, Sunset, Moon, Mail } from "lucide-react"

const RECEPCION_ICONS: Record<Recepcion, React.ElementType> = {
  MANANA:     Sun,
  INTERMEDIO: Sunset,
  TARDE:      Moon,
}

const RECEPCION_BADGE: Record<Recepcion, string> = {
  MANANA:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  INTERMEDIO: "bg-orange-100 text-orange-700 border-orange-200",
  TARDE:      "bg-indigo-100 text-indigo-700 border-indigo-200",
}

interface SeatStatusModalProps {
  seat: Seat | null
  open: boolean
  onClose: () => void
  onUpdateStatus: (
    seatId:       string,
    status:       SeatStatus,
    userName?:    string,
    shareLimit?:  number,
    peopleCount?: number,
    recepcion?:   Recepcion,
    receptor?:    string,
    gmail?:       string,
  ) => void
  isAdmin?: boolean
}

export function SeatStatusModal({
  seat, open, onClose, onUpdateStatus, isAdmin = false,
}: SeatStatusModalProps) {
  const [userName,       setUserName]       = useState("")
  const [gmail,          setGmail]          = useState("")
  const [receptor,       setReceptor]       = useState("")
  const [selectedStatus, setSelectedStatus] = useState<SeatStatus>("occupied")
  const [shareLimit,     setShareLimit]     = useState("2")
  const [peopleCount,    setPeopleCount]    = useState("1")
  const [recepcion,      setRecepcion]      = useState<Recepcion>("MANANA")

  if (!seat) return null

  const handleOccupySeat = () => {
    if (!userName.trim()) return
    const limit = selectedStatus === "for-share" ? Number.parseInt(shareLimit) : undefined
    const count = Number.parseInt(peopleCount)
    onUpdateStatus(
      seat.id, selectedStatus, userName, limit, count,
      recepcion,
      receptor.trim() || undefined,
      gmail.trim()    || undefined,
    )
    setUserName(""); setGmail(""); setReceptor("")
    setSelectedStatus("occupied"); setShareLimit("2")
    setPeopleCount("1"); setRecepcion("MANANA")
    onClose()
  }

  const handleFreeSeat    = () => { onUpdateStatus(seat.id, "available"); onClose() }
  const handleAdminUpdate = () => { onUpdateStatus(seat.id, selectedStatus); onClose() }

  const turnoActivo = seat.recepcion as Recepcion | undefined
  const TurnoIcon   = turnoActivo ? RECEPCION_ICONS[turnoActivo] : null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-lg md:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">{seat.id}</DialogTitle>
          <DialogDescription>
            {seat.zone && <span className="block text-sm md:text-base font-medium">{seat.zone}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {seat.image && (
            <div className="w-full h-40 md:h-48 rounded-lg overflow-hidden bg-muted">
              <img src={seat.image || "/placeholder.svg"} alt={seat.id} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Estado general */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs md:text-sm text-muted-foreground">Estado</div>
              <div className="text-sm md:text-base font-semibold">{seatStatusLabels[seat.status]}</div>
            </div>
            {seat.capacity && (
              <div>
                <div className="text-xs md:text-sm text-muted-foreground">Capacidad</div>
                <div className="text-sm md:text-base font-semibold">{seat.capacity} personas</div>
              </div>
            )}
            {seat.zone && (
              <div className="col-span-1 sm:col-span-2">
                <div className="text-xs md:text-sm text-muted-foreground">Zona</div>
                <div className="text-sm md:text-base font-semibold">{seat.zone}</div>
              </div>
            )}
          </div>

          {seat.amenities && seat.amenities.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm md:text-base mb-2">Comodidades</h3>
              <div className="flex flex-wrap gap-2">
                {seat.amenities.map((amenity, idx) => (
                  <div key={idx} className="px-3 py-1 bg-primary/10 rounded-full text-xs md:text-sm">{amenity}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── Info de reserva activa ── */}
          {seat.status !== "available" && seat.status !== "out-of-service" && (
            <div className="p-3 md:p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
              <h3 className="font-semibold text-sm md:text-base">Información de Reserva</h3>

              {/* Badge turno */}
              {turnoActivo && TurnoIcon && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${RECEPCION_BADGE[turnoActivo]}`}>
                  <TurnoIcon className="w-3.5 h-3.5" />
                  Turno {RECEPCION_LABELS[turnoActivo]}
                </div>
              )}

              <div className="space-y-2 text-sm md:text-base">
                {seat.userName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reservado por:</span>
                    <span className="font-medium">{seat.userName}</span>
                  </div>
                )}
                {seat.gmail && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gmail:</span>
                    <span className="font-medium">{seat.gmail}</span>
                  </div>
                )}
                {seat.receptor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recibido por:</span>
                    <span className="font-medium">{seat.receptor}</span>
                  </div>
                )}
                {seat.occupiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desde:</span>
                    <span className="font-medium">
                      {seat.occupiedAt.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {seat.mapPdfUrl && (
            <Button variant="outline" className="w-full bg-transparent text-xs md:text-sm" asChild>
              <a href={seat.mapPdfUrl} target="_blank" rel="noopener noreferrer">
                Ver Mapa Completo del Coworking (PDF)
              </a>
            </Button>
          )}

          {/* ── Formulario nueva reserva ── */}
          {!isAdmin && canOccupySeat(seat.status) && (
            <div className="space-y-4 p-3 md:p-4 bg-card border rounded-lg">
              <h3 className="font-semibold text-sm md:text-base">Crear Reserva</h3>

              {/* 1. Gmail — arriba */}
              <div className="space-y-2">
                <Label htmlFor="gmail" className="text-xs md:text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Gmail <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="gmail"
                  type="email"
                  placeholder="cliente@gmail.com"
                  value={gmail}
                  onChange={(e) => setGmail(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* 2. Nombre del cliente */}
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-xs md:text-sm">Nombre del cliente</Label>
                <Input
                  id="userName"
                  placeholder="Ingresá el nombre"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* 3. Número de personas */}
              <div className="space-y-2">
                <Label htmlFor="peopleCount" className="text-xs md:text-sm">Número de personas</Label>
                <Input
                  id="peopleCount"
                  type="number"
                  min="1"
                  max="10"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* 4. Estado del área */}
              <div className="space-y-2">
                <Label htmlFor="assignStatus" className="text-xs md:text-sm">Estado del área</Label>
                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as SeatStatus)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{seatStatusLabels["available"]}</SelectItem>
                    <SelectItem value="occupied">{seatStatusLabels["occupied"]}</SelectItem>
                    <SelectItem value="out-of-service">{seatStatusLabels["out-of-service"]}</SelectItem>
                    <SelectItem value="cleaning">{seatStatusLabels["cleaning"]}</SelectItem>
                    <SelectItem value="for-share">{seatStatusLabels["for-share"]}</SelectItem>
                    <SelectItem value="shared">{seatStatusLabels["shared"]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedStatus === "for-share" && (
                <div className="space-y-2">
                  <Label htmlFor="shareLimit" className="text-xs md:text-sm">Límite de personas</Label>
                  <Input
                    id="shareLimit"
                    type="number"
                    min="2"
                    max="10"
                    value={shareLimit}
                    onChange={(e) => setShareLimit(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}

              {/* 5. Nombre del receptor — abajo */}
              <div className="space-y-2">
                <Label htmlFor="receptor" className="text-xs md:text-sm">
                  Nombre del receptor <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="receptor"
                  placeholder="¿Quién lo recibe en recepción?"
                  value={receptor}
                  onChange={(e) => setReceptor(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* 6. Turno de recepción — abajo */}
              <div className="space-y-2">
                <Label htmlFor="recepcion" className="text-xs md:text-sm">Turno de recepción</Label>
                <Select value={recepcion} onValueChange={(v) => setRecepcion(v as Recepcion)}>
                  <SelectTrigger id="recepcion" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RECEPCION_LABELS) as Recepcion[]).map((key) => {
                      const Icon = RECEPCION_ICONS[key]
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            {RECEPCION_LABELS[key]}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleOccupySeat} className="w-full text-sm" disabled={!userName.trim()}>
                Asignar asiento
              </Button>
            </div>
          )}

          {!isAdmin && seat.status !== "available" && seat.status !== "out-of-service" && (
            <Button onClick={handleFreeSeat} variant="destructive" className="w-full text-sm">
              Liberar asiento
            </Button>
          )}

          {isAdmin && (
            <div className="space-y-4 p-3 md:p-4 bg-card border rounded-lg">
              <h3 className="font-semibold text-sm md:text-base">Modo Administrador</h3>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs md:text-sm">Cambiar estado del área</Label>
                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as SeatStatus)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(seatStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdminUpdate} className="w-full text-sm">Actualizar estado</Button>
            </div>
          )}

          {(seat.status === "available" || seat.status === "for-share") && !isAdmin && (
            <div className="p-3 md:p-4 bg-primary/10 border border-primary/30 rounded-lg text-center">
              <p className="font-semibold text-sm md:text-base mb-1">Este espacio está disponible</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Acércate a recepción para ocupar este lugar o completa el formulario arriba.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="text-sm bg-transparent">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "  ✅  seat-status-modal.tsx listo"

# ── 4. components/editar-reserva-modal.tsx ────────────────────────────────────
echo "📝  Actualizando editar-reserva-modal.tsx..."
cat > components/editar-reserva-modal.tsx << 'EOF'
"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Sun, Sunset, Moon, Mail } from "lucide-react"
import { reservasApi }               from "@/lib/api"
import { useToast }                  from "@/hooks/use-toast"
import type { BackendReserva, Recepcion } from "@/types/seat"
import { RECEPCION_LABELS }              from "@/types/seat"

const RECEPCION_ICONS: Record<Recepcion, React.ElementType> = {
  MANANA:     Sun,
  INTERMEDIO: Sunset,
  TARDE:      Moon,
}

interface EditarReservaModalProps {
  reserva:      BackendReserva | null
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

export function EditarReservaModal({
  reserva, open, onOpenChange, onSuccess,
}: EditarReservaModalProps) {
  const { toast } = useToast()

  const [nombre,    setNombre]    = useState("")
  const [gmail,     setGmail]     = useState("")
  const [receptor,  setReceptor]  = useState("")
  const [detalles,  setDetalles]  = useState("")
  const [recepcion, setRecepcion] = useState<Recepcion>("MANANA")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (reserva) {
      setNombre(reserva.nombre ?? "")
      setGmail(reserva.gmail ?? "")
      setReceptor(reserva.receptor ?? "")
      setDetalles(reserva.detalles ?? "")
      setRecepcion((reserva.recepcion as Recepcion) ?? "MANANA")
    }
  }, [reserva])

  const handleGuardar = async () => {
    if (!reserva) return
    if (!nombre.trim()) {
      toast({ variant: "destructive", title: "El nombre es obligatorio" })
      return
    }
    setGuardando(true)
    try {
      await reservasApi.update(reserva.id, {
        nombre:    nombre.trim(),
        gmail:     gmail.trim()    || undefined,
        receptor:  receptor.trim() || undefined,
        detalles:  detalles.trim() || undefined,
        recepcion,
      })
      toast({ title: "✅ Reserva actualizada", description: `${reserva.area?.nombre ?? "Área"} editada correctamente` })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Error al guardar" })
    } finally {
      setGuardando(false)
    }
  }

  if (!reserva) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl p-5">
        <DialogHeader>
          <DialogTitle className="text-lg">Editar reserva</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {reserva.area?.nombre ?? `Reserva #${reserva.id}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Gmail — arriba */}
          <div className="space-y-1.5">
            <Label htmlFor="er-gmail" className="text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Gmail <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="er-gmail"
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="cliente@gmail.com"
              className="text-sm"
            />
          </div>

          {/* Nombre del cliente */}
          <div className="space-y-1.5">
            <Label htmlFor="er-nombre" className="text-sm">Nombre del cliente</Label>
            <Input
              id="er-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del cliente"
              className="text-sm"
            />
          </div>

          {/* Detalles */}
          <div className="space-y-1.5">
            <Label htmlFor="er-detalles" className="text-sm">
              Detalles <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="er-detalles"
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Información adicional"
              className="text-sm"
            />
          </div>

          {/* Receptor — abajo */}
          <div className="space-y-1.5">
            <Label htmlFor="er-receptor" className="text-sm">
              Nombre del receptor <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="er-receptor"
              value={receptor}
              onChange={(e) => setReceptor(e.target.value)}
              placeholder="¿Quién lo recibe en recepción?"
              className="text-sm"
            />
          </div>

          {/* Turno — abajo */}
          <div className="space-y-1.5">
            <Label htmlFor="er-recepcion" className="text-sm">Turno de recepción</Label>
            <Select value={recepcion} onValueChange={(v) => setRecepcion(v as Recepcion)}>
              <SelectTrigger id="er-recepcion" className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RECEPCION_LABELS) as Recepcion[]).map((key) => {
                  const Icon = RECEPCION_ICONS[key]
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {RECEPCION_LABELS[key]}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando} className="text-sm bg-transparent">
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={guardando || !nombre.trim()} className="text-sm gap-1.5">
            {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
EOF
echo "  ✅  editar-reserva-modal.tsx listo"

# ── 5. hooks/use-seats.ts ─────────────────────────────────────────────────────
echo "📝  Actualizando hooks/use-seats.ts..."
cat > hooks/use-seats.ts << 'EOF'
"use client"

import { useState, useCallback, useRef } from "react"
import type { Seat, Recepcion } from "@/types/seat"
import { areasApi, reservasApi, convertBackendAreaToSeat } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const POLLING_MS = 30_000

export function useSeats() {
  const { toast } = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast

  const [seats,   setSeats]   = useState<Seat[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [areas, reservas] = await Promise.all([areasApi.getAll(), reservasApi.getAll()])
      setSeats(areas.map((area) => convertBackendAreaToSeat(area, reservas)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar áreas")
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSeatStatus = useCallback(async (
    seat:         Seat,
    newStatus:    string,
    userName?:    string,
    peopleCount?: number,
    shareLimit?:  number,
    recepcion?:   Recepcion,
    receptor?:    string,
    gmail?:       string,
  ) => {
    if (!seat.backendId) throw new Error("Asiento sin ID de backend")

    try {
      if (newStatus === "occupied" || newStatus === "for-share" || newStatus === "shared") {
        if (!userName) throw new Error("Nombre de usuario requerido")

        const user = await (async () => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL ?? ""}/usuario`,
              { headers: { "Content-Type": "application/json" } }
            )
            if (!res.ok) return null
            const usuarios = await res.json()
            return usuarios.find((u: { nombre: string; id: number }) => u.nombre === userName) ?? null
          } catch { return null }
        })()

        const usuarioId = user?.id ?? 1
        const detalles  =
          newStatus === "for-share"
            ? `Para compartir (límite: ${shareLimit || 6}, personas: ${peopleCount})`
            : `Ocupado por ${peopleCount} persona(s)`

        await reservasApi.create({
          nombre: userName,
          detalles,
          usuarioId,
          areaId: seat.backendId,
          ...(recepcion && { recepcion }),
          ...(receptor  && { receptor }),
          ...(gmail     && { gmail }),
        })

        if (newStatus === "for-share") {
          const reservas    = await reservasApi.getAll()
          const activeCount = reservas.filter((r) => r.areaId === seat.backendId && r.fin === null).length
          await areasApi.cambiarEstado(seat.backendId, activeCount >= (shareLimit || 6) ? "shared" : newStatus)
        } else {
          await areasApi.cambiarEstado(seat.backendId, newStatus)
        }

        toastRef.current({ title: "Reserva creada", description: `${seat.id} asignado a ${userName}` })
      } else {
        await areasApi.cambiarEstado(seat.backendId, newStatus)
        toastRef.current({ title: "Estado actualizado", description: `${seat.id} cambió de estado` })
      }

      await fetchSeats()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar"
      setError(msg)
      toastRef.current({ variant: "destructive", title: "Error al actualizar asiento", description: msg })
      throw err
    }
  }, [fetchSeats])

  const toggleBlockAll = useCallback(async (block: boolean) => {
    try {
      setLoading(true)
      await areasApi.bloquearTodas(block)
      toastRef.current({
        title:       block ? "Coworking bloqueado" : "Coworking desbloqueado",
        description: block ? "Todas las áreas están bloqueadas" : "Las áreas volvieron a su estado libre",
      })
      await fetchSeats()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al operar"
      setError(msg)
      toastRef.current({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setLoading(false)
    }
  }, [fetchSeats])

  return { seats, loading, error, fetchSeats, updateSeatStatus, toggleBlockAll, POLLING_MS }
}
EOF
echo "  ✅  hooks/use-seats.ts listo"

echo ""
echo "🔨  Build de verificación..."
pnpm build

echo ""
echo "✅  v31-front-gmail-reserva completado"