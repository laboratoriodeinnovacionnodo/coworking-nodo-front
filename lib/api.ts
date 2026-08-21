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
