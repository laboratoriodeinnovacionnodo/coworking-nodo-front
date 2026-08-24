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
