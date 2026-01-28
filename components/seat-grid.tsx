"use client"

import type { Seat } from "@/types/seat"
import { seatStatusColors } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"
import { Armchair } from "lucide-react"

interface SeatGridProps {
  seats: Seat[]
  onSeatClick: (seat: Seat) => void
  isBlocked?: boolean
}

export function SeatGrid({ seats, onSeatClick, isBlocked }: SeatGridProps) {
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

  return (
    <div className="space-y-3 md:space-y-4">
      {rows.map((row) => (
        <div key={row} className="flex items-start gap-2 md:gap-3">
          <div className="w-6 md:w-8 text-xs md:text-sm font-medium text-muted-foreground pt-2 flex-shrink-0">{row}</div>
          <div className="flex gap-2 md:gap-3 flex-wrap flex-1">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => !isBlocked && onSeatClick(seat)}
                  disabled={isBlocked}
                  className={cn(
                    "relative flex flex-col items-center justify-center min-w-16 md:min-w-20 px-2 md:px-3 py-2 md:py-3 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed border-2 text-xs md:text-sm",
                    seatStatusColors[seat.status],
                  )}
                  title={`${seat.id} - ${seat.status} - ${seat.userName || "Disponible"}`}
                >
                  <Armchair className="w-5 md:w-6 h-5 md:h-6 mb-1" />
                  <span className="text-[10px] md:text-xs font-semibold text-center leading-tight truncate max-w-full">
                    {seat.id.length <= 3 ? seat.id : seat.id.substring(0, 15)}
                  </span>
                  {seat.id.length > 3 && (
                    <span className="text-[8px] md:text-[10px] text-center opacity-75 mt-0.5 truncate max-w-full">{seat.zone || "Área"}</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
