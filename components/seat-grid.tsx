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
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row} className="flex items-start gap-3">
          {/* Letra de fila */}
          <div className="w-5 text-xs font-semibold text-slate-400 pt-3 flex-shrink-0 select-none">
            {row}
          </div>

          {/* Cards */}
          <div className="flex gap-2.5 flex-wrap flex-1">
            {seatsByRow[row]
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <div
                  key={seat.id}
                  title={`${seat.id} — ${seatStatusLabel[seat.status]}`}
                  className={cn(
                    // fondo blanco sólido, sin blur
                    "bg-white border border-slate-200 rounded-xl",
                    "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
                    "flex flex-col items-center gap-1 px-2 py-2.5",
                    "w-[52px] select-none transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)]",
                    isBlocked && "opacity-40 cursor-not-allowed pointer-events-none",
                  )}
                >
                  {/* Punto de color */}
                  <span className={cn("w-2.5 h-2.5 rounded-full", seatStatusDot[seat.status])} />
                  {/* Número */}
                  <span className="text-[11px] font-bold text-slate-800 leading-none">
                    {seat.number}
                  </span>
                  {/* Badge */}
                  <span className={cn(
                    "text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap",
                    seatStatusBadge[seat.status],
                  )}>
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
