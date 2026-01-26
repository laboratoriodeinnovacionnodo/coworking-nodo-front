export type SeatStatus =
  | "available" // Libre
  | "occupied" // Ocupado
  | "out-of-service" // Fuera de servicio
  | "cleaning" // Limpiando
  | "for-share" // Para compartir
  | "shared" // Compartido

export interface Seat {
  id: string
  backendId?: number // ID del área en el backend
  row: string
  number: number
  status: SeatStatus
  userName?: string
  occupiedAt?: Date
  sharedUsers?: string[]
  shareLimit?: number
  peopleCount?: number
  // Nuevas propiedades para display mejorado
  image?: string // URL de la foto del asiento
  capacity?: number // Capacidad máxima de personas
  zone?: string // Zona o área del coworking (ej: "Zona Silenciosa", "Zona Colaborativa")
  amenities?: string[] // Comodidades (ej: "Monitor extra", "Ventana", "Enchufe USB-C")
  mapPdfUrl?: string // URL del PDF con el mapa completo
}

export interface SeatArea {
  id: string
  name: string
  seats: Seat[]
  isBlocked: boolean
  eventName?: string
}

export interface BackendUsuario {
  id: number
  nombre: string
  email: string
  reservas?: BackendReserva[]
  createdAt: string
}

export interface BackendAdmin {
  id: number
  nombre: string
  email: string
  password: string
  createdAt: string
}

export interface BackendArea {
  id: number
  nombre: string
  descripcion: string | null
  estado: "LIBRE" | "OCUPADO" | "LIMPIANDO" | "FUERA_DE_SERVICIO" | "PARA_COMPARTIR" | "COMPARTIDO"
  reservas?: BackendReserva[]
  createdAt: string
}

export interface BackendReserva {
  id: number
  nombre: string // Nombre del cliente que reservó
  detalles: string | null // Datos adicionales
  usuario?: BackendUsuario
  usuarioId: number
  area?: BackendArea
  areaId: number
  inicio: string // DateTime
  fin: string | null // DateTime o null si aún está activa
  createdAt: string
}
