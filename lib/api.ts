const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"

import type { BackendArea, BackendReserva, BackendUsuario, BackendAdmin } from "@/types/seat"

// Mapeo de estados entre frontend y backend
const statusMap: Record<string, string> = {
  available: "LIBRE",
  occupied: "OCUPADO",
  "out-of-service": "FUERA_DE_SERVICIO",
  cleaning: "LIMPIANDO",
  "for-share": "PARA_COMPARTIR",
  shared: "COMPARTIDO",
}

const reverseStatusMap: Record<string, string> = {
  LIBRE: "available",
  OCUPADO: "occupied",
  FUERA_DE_SERVICIO: "out-of-service",
  LIMPIANDO: "cleaning",
  PARA_COMPARTIR: "for-share",
  COMPARTIDO: "shared",
}

export const usuariosApi = {
  getAll: async (): Promise<BackendUsuario[]> => {
    const response = await fetch(`${API_BASE_URL}/usuario`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Error al obtener usuarios")
    return response.json()
  },

  getById: async (id: number): Promise<BackendUsuario> => {
    const response = await fetch(`${API_BASE_URL}/usuario/${id}`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Error al obtener usuario")
    return response.json()
  },

  create: async (data: { nombre: string; email: string }): Promise<BackendUsuario> => {
    const response = await fetch(`${API_BASE_URL}/usuario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Error al crear usuario")
    return response.json()
  },

  update: async (id: number, data: Partial<{ nombre: string; email: string }>): Promise<BackendUsuario> => {
    const response = await fetch(`${API_BASE_URL}/usuario/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Error al actualizar usuario")
    return response.json()
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/usuario/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Error al eliminar usuario")
  },
}

export const areasApi = {
  getAll: async (): Promise<BackendArea[]> => {
    try {
      console.log("Fetching areas from:", `${API_BASE_URL}/areas`)
      const response = await fetch(`${API_BASE_URL}/areas`, {
        headers: { "Content-Type": "application/json" },
      })
      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Areas fetched:", data)
      return data
    } catch (error) {
      console.error("Fetch error:", error)
      throw error
    }
  },

  getById: async (id: number): Promise<BackendArea> => {
    const response = await fetch(`${API_BASE_URL}/areas/${id}`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Error al obtener área")
    return response.json()
  },

  create: async (data: { nombre: string; descripcion?: string; estado?: string }): Promise<BackendArea> => {
    const response = await fetch(`${API_BASE_URL}/areas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Error al crear área")
    return response.json()
  },

  update: async (id: number, data: Partial<BackendArea>): Promise<BackendArea> => {
    const response = await fetch(`${API_BASE_URL}/areas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Error al actualizar área")
    return response.json()
  },

  cambiarEstado: async (id: number, estado: string): Promise<BackendArea> => {
    const backendEstado = statusMap[estado] || estado
    const response = await fetch(`${API_BASE_URL}/areas/${id}/estado/${backendEstado}`, {
      method: "PATCH",
    })
    if (!response.ok) throw new Error("Error al cambiar estado")
    return response.json()
  },

  bloquearTodas: async (bloquear: boolean): Promise<BackendArea[]> => {
    const estado = bloquear ? "OCUPADO" : "LIBRE"
    console.log(`${bloquear ? "Bloqueando" : "Desbloqueando"} todas las áreas con estado:`, estado)

    // Primero obtener todas las áreas
    const areas = await areasApi.getAll()

    // Actualizar cada área con el nuevo estado
    const promises = areas.map((area) =>
      fetch(`${API_BASE_URL}/areas/${area.id}/estado/${estado}`, {
        method: "PATCH",
      }).then((res) => {
        if (!res.ok) throw new Error(`Error al actualizar área ${area.id}`)
        return res.json()
      }),
    )

    try {
      const updatedAreas = await Promise.all(promises)
      console.log("Áreas actualizadas:", updatedAreas)
      return updatedAreas
    } catch (error) {
      console.error("Error al bloquear áreas:", error)
      throw error
    }
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/areas/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Error al eliminar área")
  },
}

export const reservasApi = {
  getAll: async (): Promise<BackendReserva[]> => {
    const response = await fetch(`${API_BASE_URL}/reservas`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Error al obtener reservas")
    return response.json()
  },

  getById: async (id: number): Promise<BackendReserva> => {
    const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Error al obtener reserva")
    return response.json()
  },

  create: async (data: {
    nombre: string
    detalles?: string
    usuarioId: number
    areaId: number
  }): Promise<BackendReserva> => {
    const response = await fetch(`${API_BASE_URL}/reservas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error al crear reserva: ${error}`)
    }
    return response.json()
  },

  update: async (id: number, data: Partial<BackendReserva>): Promise<BackendReserva> => {
    const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Error al actualizar reserva")
    return response.json()
  },

  completar: async (id: number): Promise<BackendReserva> => {
    const response = await fetch(`${API_BASE_URL}/reservas/${id}/completar`, {
      method: "PATCH",
    })
    if (!response.ok) throw new Error("Error al completar reserva")
    return response.json()
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Error al eliminar reserva")
  },
}

export const adminsApi = {
  login: async (email: string, password: string): Promise<BackendAdmin> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Credenciales inválidas")
    }
    return response.json()
  },

  getAll: async (): Promise<BackendAdmin[]> => {
    const response = await fetch(`${API_BASE_URL}/admin`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Error al obtener administradores")
    return response.json()
  },

  create: async (data: { nombre: string; email: string; password: string }): Promise<BackendAdmin> => {
    const response = await fetch(`${API_BASE_URL}/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Error al crear administrador")
    return response.json()
  },
}

export const convertBackendAreaToSeat = (area: BackendArea, reservas: BackendReserva[]) => {
  // Filtrar reservas activas de esta área (sin fecha fin)
  const activeReservas = reservas.filter((r) => r.areaId === area.id && r.fin === null)

  // Extraer fila y número del nombre si tiene formato "A1", sino usar el ID
  let row = ""
  let number = 0

  const match = area.nombre.match(/^([A-Z])(\d+)$/)
  if (match) {
    row = match[1]
    number = Number.parseInt(match[2])
  } else {
    // Para nombres descriptivos, usar el ID
    row = String.fromCharCode(65 + Math.floor((area.id - 1) / 10))
    number = ((area.id - 1) % 10) + 1
  }

  // Calcular cantidad de personas compartiendo
  const peopleCount = activeReservas.length

  return {
    id: area.nombre,
    backendId: area.id,
    row,
    number,
    status: reverseStatusMap[area.estado] || "available",
    userName: activeReservas[0]?.nombre,
    occupiedAt: activeReservas[0]?.inicio ? new Date(activeReservas[0].inicio) : undefined,
    sharedUsers: activeReservas.map((r) => r.nombre),
    shareLimit: area.estado === "PARA_COMPARTIR" ? 6 : undefined, // Default limit
    peopleCount,
    // Datos adicionales para display
    image: `/placeholder.svg?height=300&width=400&query=modern coworking desk ${area.nombre}`,
    capacity: 2, // Default capacity
    zone: area.descripcion || "Zona Principal",
    amenities: ['Monitor 24"', "Enchufe USB-C", "Iluminación LED"],
    mapPdfUrl: "/coworking-map.pdf",
  }
}

export { statusMap, reverseStatusMap }
