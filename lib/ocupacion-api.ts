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
    const res = await fetch(`${BASE}/ocupaciones/${id}/liberar`, {
      method: "PATCH",
    })
    if (!res.ok) throw new Error(`Error al liberar ocupación ${id}`)
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE}/ocupaciones/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error(`Error al eliminar ocupación ${id}`)
  },
}
