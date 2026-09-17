"use client"

import { seatStatusDot, seatStatusLabel } from "@/lib/seat-utils"
import type { SeatStatus } from "@/types/seat"
import { cn } from "@/lib/utils"

const ESTADOS: SeatStatus[] = ["available", "occupied"]

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {ESTADOS.map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", seatStatusDot[status])} />
          <span className="text-muted-foreground">{seatStatusLabel[status]}</span>
        </div>
      ))}
    </div>
  )
}
