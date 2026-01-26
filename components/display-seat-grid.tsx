"use client"

import type { Seat } from "@/types/seat"
import { seatStatusColors } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"
import { Armchair, Users } from 'lucide-react'

interface DisplaySeatGridProps {
  seats: Seat[]
  onSeatClick?: (seat: Seat) => void
}

export function DisplaySeatGrid({ seats, onSeatClick }: DisplaySeatGridProps) {
  // Organizar asientos por fila
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.row]) {
        acc[seat.row] = []
      }
      acc[seat.row].push(seat)
      return acc
    },
    {} as Record<string, Seat[]>,
  )

  const rows = Object.keys(seatsByRow).sort()

  const getStatusLabel = (seat: Seat) => {
    switch (seat.status) {
      case "available":
        return "Libre"
      case "occupied":
        return seat.peopleCount ? `Ocupado (${seat.peopleCount})` : "Ocupado"
      case "out-of-service":
        return "Fuera de servicio"
      case "cleaning":
        return "Limpiando"
      case "for-share":
        return `Para compartir (${seat.peopleCount || 0}/${seat.shareLimit || 0})`
      case "shared":
        return `Compartido (${seat.peopleCount || 0}/${seat.shareLimit || 0})`
      default:
        return ""
    }
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row} className="flex items-center gap-3">
          <div className="w-10 text-lg font-semibold text-muted-foreground">{row}</div>
          <div className="flex gap-3 flex-wrap">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <div
                  key={seat.id}
                  onClick={() => onSeatClick?.(seat)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-20 h-20 rounded-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg",
                    seatStatusColors[seat.status],
                  )}
                >
                  {(seat.status === "for-share" || seat.status === "shared") && seat.peopleCount ? (
                    <Users className="w-6 h-6" />
                  ) : (
                    <Armchair className="w-6 h-6" />
                  )}
                  <span className="text-sm font-bold mt-1">{seat.number}</span>
                  {seat.peopleCount && seat.peopleCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {seat.peopleCount}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
