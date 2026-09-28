export type SeatStatus = "available" | "occupied"

export interface Seat {
  id:           string
  backendId?:   number
  row:          string
  number:       number
  status:       SeatStatus
  userName?:    string
  reservaId?:   number        // ← ID de la reserva activa (para editar)
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

export interface BackendArea {
  id:          number
  nombre:      string
  descripcion?: string
  estado:      string
  createdAt:   string
  reservas?:   BackendReserva[]
}

export interface BackendReserva {
  id:         number
  nombre:     string
  detalles?:  string
  usuarioId:  number
  areaId:     number
  inicio:     string
  fin?:       string | null
  createdAt:  string
  recepcion?: "MANANA" | "INTERMEDIO" | "TARDE"  // ← campo nuevo
  usuario?:   BackendUsuario
  area?:      BackendArea
}

export interface BackendUsuario {
  id:        number
  nombre:    string
  email:     string
  createdAt: string
}

export interface BackendAdmin {
  id:        number
  nombre?:   string
  email:     string
  createdAt: string
}
