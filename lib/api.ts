/**
 * lib/api.ts
 *
 * Cliente HTTP para coworking-back.
 *
 * CAMBIO v34: fetchSeats() usa GET /areas/estado-actual en lugar de
 * GET /areas.  El nuevo endpoint calcula el estado de cada área en
 * tiempo real (sin depender del campo persistido area.estado), por lo
 * que los asientos se liberan automáticamente cuando vence el horario
 * de una ocupación — sin necesidad de recargar manualmente.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3550"

// ── Tipos ────────────────────────────────────────────────────────────────────

export type AreaStatus = "LIBRE" | "OCUPADO"
export type SeatStatus = "available" | "occupied"

export const statusMap: Record<AreaStatus, SeatStatus> = {
  LIBRE:   "available",
  OCUPADO: "occupied",
}

export const reverseStatusMap: Record<SeatStatus, AreaStatus> = {
  available: "LIBRE",
  occupied:  "OCUPADO",
}

export interface BackendArea {
  id:          number
  nombre:      string
  descripcion: string | null
  estado:      AreaStatus
  createdAt:   string
}

export interface BackendReserva {
  id:        number
  nombre:    string
  gmail?:    string | null
  detalles?: string | null
  usuarioId: number
  areaId:    number
  recepcion?: string | null
  receptor?:  string | null
  inicio:    string
  fin:       string | null
  createdAt: string
}

export interface BackendAdmin {
  id:        number
  email:     string
  createdAt: string
}

// ── Áreas ────────────────────────────────────────────────────────────────────

export const areasApi = {
  /** Lista todas las áreas (campo estado persistido). */
  getAll: async (): Promise<BackendArea[]> => {
    const res = await fetch(`${API_BASE_URL}/areas`, { cache: "no-store" })
    if (!res.ok) throw new Error("Error al obtener áreas")
    return res.json()
  },

  /**
   * Devuelve el estado de cada área calculado en tiempo real:
   * considera ocupaciones activas AHORA y reservas de asiento vigentes.
   * Usar este endpoint para mostrar el estado correcto en el grid de asientos.
   */
  getEstadoActual: async (): Promise<BackendArea[]> => {
    const res = await fetch(`${API_BASE_URL}/areas/estado-actual`, {
      cache: "no-store",
    })
    if (!res.ok) throw new Error("Error al obtener estado actual de áreas")
    return res.json()
  },

  update: async (id: number, data: Partial<BackendArea>): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar área")
    return res.json()
  },

  cambiarEstado: async (id: number, estado: AreaStatus): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}/estado/${estado}`, {
      method: "PATCH",
    })
    if (!res.ok) throw new Error("Error al cambiar estado del área")
    return res.json()
  },

  bloquearTodas: async (estado: AreaStatus): Promise<BackendArea[]> => {
    const res = await fetch(`${API_BASE_URL}/areas/bloquear-todas/${estado}`, {
      method: "PATCH",
    })
    if (!res.ok) throw new Error("Error al bloquear áreas")
    return res.json()
  },
}

// ── Reservas ─────────────────────────────────────────────────────────────────

export const reservasApi = {
  getAll: async (): Promise<BackendReserva[]> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, { cache: "no-store" })
    if (!res.ok) throw new Error("Error al obtener reservas")
    return res.json()
  },

  create: async (data: {
    nombre:    string
    gmail?:    string
    detalles?: string
    usuarioId: number
    areaId:    number
    recepcion?: string
    receptor?:  string
  }): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    if (!res.ok) {
      const e = await res.text()
      throw new Error(e || "Error al crear reserva")
    }
    return res.json()
  },

  completar: async (id: number): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}/completar`, {
      method: "PATCH",
    })
    if (!res.ok) throw new Error("Error al completar reserva")
    return res.json()
  },

  update: async (id: number, data: Partial<BackendReserva>): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar reserva")
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar reserva")
  },
}

// ── Admins ───────────────────────────────────────────────────────────────────

export const adminApi = {
  login: async (email: string, password: string): Promise<BackendAdmin> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(e || "Credenciales inválidas") }
    return res.json()
  },

  getAll: async (): Promise<BackendAdmin[]> => {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) throw new Error("Error al obtener administradores")
    return res.json()
  },

  create: async (data: { nombre: string; email: string; password: string }): Promise<BackendAdmin> => {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear administrador")
    return res.json()
  },
}

// ── Convertidor área → seat ───────────────────────────────────────────────────

export const convertBackendAreaToSeat = (
  area: BackendArea,
  reservas: BackendReserva[],
) => {
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
    // El estado ya viene calculado en tiempo real desde el endpoint estado-actual
    status: ({ LIBRE: "available", OCUPADO: "occupied" }[area.estado] ?? "available") as
      | "available"
      | "occupied",
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

export { statusMap as default, reverseStatusMap }

// Alias de compatibilidad — auth-context.tsx usa adminsApi
export const adminsApi = adminApi
