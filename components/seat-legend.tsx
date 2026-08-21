"use client"

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0" />
        <span className="text-muted-foreground">Libre</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0" />
        <span className="text-muted-foreground">Ocupado</span>
      </div>
    </div>
  )
}
