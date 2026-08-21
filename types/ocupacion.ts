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
  dia:              string
  hora:             string
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
  dia:              string
  hora:             string
  edadMin?:         number
  edadMax?:         number
  anexos?:          string[]
  areaIds:          number[]
}
