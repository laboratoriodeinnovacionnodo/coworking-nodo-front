import type { SeatStatus } from "@/types/seat"

/** Color del punto de estado (pequeño, sólido) */
export const seatStatusDot: Record<SeatStatus, string> = {
  available:      "bg-green-500",
  occupied:       "bg-red-400",
}

/** Clases del badge de estado (fondo suave + texto de color) */
export const seatStatusBadge: Record<SeatStatus, string> = {
  available:      "bg-green-100 text-green-700",
  occupied:       "bg-red-100   text-red-600",
}

/** Texto legible del estado */
export const seatStatusLabel: Record<SeatStatus, string> = {
  available: "Libre",
  occupied:  "Ocupado",
}

/**
 * Mantener por compatibilidad con cualquier componente que aún use
 * seatStatusColors (devuelve los colores suaves del badge).
 */
export const seatStatusColors: Record<SeatStatus, string> = seatStatusBadge
