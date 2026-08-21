import type { SeatStatus } from "@/types/seat"

export const seatStatusColors: Record<SeatStatus, string> = {
  available: "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200",
  occupied:  "bg-red-100   text-red-800   border border-red-300   hover:bg-red-200",
}

export const seatStatusLabel: Record<SeatStatus, string> = {
  available: "Libre",
  occupied:  "Ocupado",
}
