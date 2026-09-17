"use client"

import type { Seat } from "@/types/seat"
import { seatStatusDot, seatStatusBadge, seatStatusLabel } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"

interface SeatGridProps {
  seats:      Seat[]
  isBlocked?: boolean
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
          {/* Letra de fila */}
          <div className="w-6 md:w-8 text-xs md:text-sm font-medium text-muted-foreground pt-3 flex-shrink-0">
            {row}
          </div>

          {/* Cards de asientos */}
          <div className="flex gap-2 md:gap-3 flex-wrap flex-1">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <div
                  key={seat.id}
                  title={`${seat.id} — ${seatStatusLabel[seat.status]}`}
                  className={cn(
                    "bg-white border border-gray-100 rounded-2xl shadow-sm",
                    "flex flex-col items-center gap-1.5 px-2 py-2.5",
                    "w-12 md:w-14 transition-shadow hover:shadow-md",
                    isBlocked && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {/* Punto de color */}
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      seatStatusDot[seat.status],
                    )}
                  />
                  {/* Número */}
                  <span className="text-xs font-bold text-gray-800 leading-none">
                    {seat.number}
                  </span>
                  {/* Badge suave */}
                  <span
                    className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none",
                      seatStatusBadge[seat.status],
                    )}
                  >
                    {seatStatusLabel[seat.status]}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
