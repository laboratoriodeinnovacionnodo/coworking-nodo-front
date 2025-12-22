import { seatStatusLabels, seatStatusColors } from "@/lib/seat-utils"
import { Armchair } from "lucide-react"
import type { SeatStatus } from "@/types/seat"

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-4">
      {Object.entries(seatStatusLabels).map(([status, label]) => (
        <div key={status} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded flex items-center justify-center ${seatStatusColors[status as SeatStatus]}`}>
            <Armchair className="w-4 h-4" />
          </div>
          <span className="text-sm text-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
