export type SeatStatus =
  | "available"  // LIBRE
  | "occupied"   // OCUPADO

export interface Seat {
  id:         string
  backendId?: number
  row:        string
  number:     number
  status:     SeatStatus
  userName?:  string
  occupiedAt?: Date
  peopleCount?: number
  image?:     string
  capacity?:  number
  zone?:      string
  amenities?: string[]
  mapPdfUrl?: string
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
  nombre:    string
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
  id:        number
  nombre:    string
  detalles:  string | null
  usuario?:  BackendUsuario
  usuarioId: number
  area?:     BackendArea
  areaId:    number
  inicio:    string
  fin:       string | null
  createdAt: string
}
