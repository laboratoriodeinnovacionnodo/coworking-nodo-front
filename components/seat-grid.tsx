"use client"

import type { Seat } from "@/types/seat"
import { seatStatusColors } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"
import { Armchair } from "lucide-react"

interface SeatGridProps {
  seats:       Seat[]
  isBlocked?:  boolean
}

export function SeatGrid({ seats, isBlocked }: SeatGridProps) {
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = []
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
          <div className="w-6 md:w-8 text-xs md:text-sm font-medium text-muted-foreground pt-2 flex-shrink-0">
            {row}
          </div>
          <div className="flex gap-2 md:gap-3 flex-wrap flex-1">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <div
                  key={seat.id}
                  title={`${seat.id} — ${seat.status === "available" ? "Libre" : "Ocupado"}`}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg transition-all",
                    seatStatusColors[seat.status],
                    isBlocked && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Armchair className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs font-bold mt-0.5">{seat.number}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
