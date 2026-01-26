import type { SeatStatus } from "@/types/seat"

export const seatStatusLabels: Record<SeatStatus, string> = {
  available: "Libre",
  occupied: "Ocupado",
  "out-of-service": "Fuera de servicio",
  cleaning: "Limpiando",
  "for-share": "Para compartir",
  shared: "Compartido",
}

export const seatStatusColors: Record<SeatStatus, string> = {
  available: "bg-[var(--seat-available)] text-white",
  occupied: "bg-[var(--seat-occupied)] text-white",
  "out-of-service": "bg-[var(--seat-out-of-service)] text-white",
  cleaning: "bg-[var(--seat-cleaning)] text-white",
  "for-share": "bg-[var(--seat-for-share)] text-white",
  shared: "bg-[var(--seat-shared)] text-white",
}

export const canOccupySeat = (status: SeatStatus): boolean => {
  return status === "available" || status === "for-share"
}

export const canFreeSeat = (status: SeatStatus): boolean => {
  return status === "occupied" || status === "shared"
}
