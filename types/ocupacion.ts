export type RecepcionTurno = "MANANA" | "INTERMEDIO" | "TARDE"

export const RECEPCION_OC_LABELS: Record<RecepcionTurno, string> = {
  MANANA:     "Mañana",
  INTERMEDIO: "Intermedio",
  TARDE:      "Tarde",
}

export const RECEPCION_OC_EMOJI: Record<RecepcionTurno, string> = {
  MANANA:     "☀️",
  INTERMEDIO: "🌅",
  TARDE:      "🌙",
}

export interface OcupacionArea {
  ocupacionId: number
  areaId:      number
  area: {
    id:     number
    nombre: string
  }
}

export interface Ocupacion {
  id:               number
  titulo:           string
  requerimiento:    string
  cantidadPersonas: number
  organizador:      string
  telefono?:        string | null
  gmail?:           string | null
  recepcion?:       RecepcionTurno | null
  receptor?:        string | null
  fechaDesde:       string
  fechaHasta:       string
  horaDesde:        string
  horaHasta:        string
  edadMin?:         number | null
  edadMax?:         number | null
  anexos:           string[]
  liberadaAt?:      string | null
  createdAt:        string
  updatedAt:        string
  areas:            OcupacionArea[]
}

export interface CreateOcupacionPayload {
  titulo:           string
  requerimiento:    string
  cantidadPersonas: number
  organizador:      string
  telefono?:        string
  gmail?:           string
  recepcion?:       RecepcionTurno
  receptor?:        string
  fechaDesde:       string
  fechaHasta:       string
  horaDesde:        string
  horaHasta:        string
  edadMin?:         number
  edadMax?:         number
  anexos?:          string[]
  areaIds:          number[]
}
