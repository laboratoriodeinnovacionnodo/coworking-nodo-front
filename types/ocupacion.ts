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
  fechaDesde:       string
  fechaHasta:       string
  horaDesde:        string
  horaHasta:        string
  edadMin?:         number
  edadMax?:         number
  anexos?:          string[]
  areaIds:          number[]
}
