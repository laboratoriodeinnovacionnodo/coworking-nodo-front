"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge }      from "@/components/ui/badge"
import { Button }     from "@/components/ui/button"
import { SeatGrid }   from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import type { Seat }  from "@/types/seat"
import { getAreaImage, getAreaLabel } from "@/lib/area-images"
import { cn }         from "@/lib/utils"
import { Armchair, ImageIcon, ChevronLeft } from "lucide-react"

interface ZonaGroup {
  letra:     string
  seats:     Seat[]
  isBlocked: boolean
  eventName?: string
}

interface AsientosMapaModalProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  seats:         Seat[]
  isBlocked?:    boolean
  eventoTitulo?: string
}

function agruparPorZona(seats: Seat[], isBlocked: boolean, eventoTitulo?: string): ZonaGroup[] {
  const map = new Map<string, Seat[]>()
  for (const seat of seats) {
    const letra = seat.zone ?? "A"
    if (!map.has(letra)) map.set(letra, [])
    map.get(letra)!.push(seat)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, s]) => ({
      letra,
      seats:     s,
      isBlocked,
      eventName: isBlocked ? eventoTitulo : undefined,
    }))
}

export function AsientosMapaModal({
  open,
  onOpenChange,
  seats,
  isBlocked = false,
  eventoTitulo,
}: AsientosMapaModalProps) {

  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaGroup | null>(null)
  const [imgError,         setImgError]         = useState(false)

  useEffect(() => {
    if (!open) { setZonaSeleccionada(null); setImgError(false) }
  }, [open])

  const zonas  = agruparPorZona(seats, isBlocked, eventoTitulo)
  const libres   = zonaSeleccionada?.seats.filter((s) => s.status === "available").length ?? 0
  const ocupados = zonaSeleccionada?.seats.filter((s) => s.status === "occupied").length  ?? 0
  const imagen   = zonaSeleccionada ? getAreaImage(zonaSeleccionada.letra) : null
  const label    = zonaSeleccionada ? getAreaLabel(zonaSeleccionada.letra) : ""
  const descZona = zonaSeleccionada?.seats[0]?.amenities?.[0] ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Armchair className="w-5 h-5 text-primary" />
            {zonaSeleccionada ? label : "Asientos / Mapa"}
          </DialogTitle>
          <DialogDescription>
            {zonaSeleccionada
              ? `${libres} libre${libres !== 1 ? "s" : ""} · ${ocupados} ocupado${ocupados !== 1 ? "s" : ""}`
              : "Seleccioná una zona para ver su estado"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Grilla de zonas ─────────────────────────────────────────── */}
        {!zonaSeleccionada && (
          <div className="space-y-4 py-2">
            <SeatLegend />

            {isBlocked && eventoTitulo && (
              <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm">
                <span className="font-medium">Evento activo:</span> {eventoTitulo}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {zonas.map((zona) => {
                const img   = getAreaImage(zona.letra)
                const lbl   = getAreaLabel(zona.letra)
                const lib   = zona.seats.filter((s) => s.status === "available").length
                const ocu   = zona.seats.filter((s) => s.status === "occupied").length
                const total = zona.seats.length
                const pct   = total > 0 ? Math.round((ocu / total) * 100) : 0
                const desc  = zona.seats[0]?.amenities?.[0] ?? null

                return (
                  <button
                    key={zona.letra}
                    type="button"
                    onClick={() => { setImgError(false); setZonaSeleccionada(zona) }}
                    className="group text-left rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Imagen */}
                    <div className="relative w-full h-40 bg-muted overflow-hidden">
                      {img ? (
                        <Image
                          src={img}
                          alt={lbl}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs">Sin imagen</span>
                        </div>
                      )}
                      {/* Nombre zona sobre imagen */}
                      <div className="absolute top-2 left-2">
                        <span className="text-lg font-bold text-white drop-shadow-md">{lbl}</span>
                      </div>
                      {/* Badge ocupación */}
                      <div className="absolute top-2 right-2">
                        {zona.isBlocked ? (
                          <Badge variant="destructive" className="text-[10px]">Bloqueada</Badge>
                        ) : ocu === total && total > 0 ? (
                          <Badge className="bg-red-500 text-white text-[10px]">Llena</Badge>
                        ) : lib === total ? (
                          <Badge className="bg-green-500 text-white text-[10px]">Libre</Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white text-[10px]">Parcial</Badge>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 space-y-2">
                      {desc && (
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{desc}</p>
                      )}
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === 100 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          {lib} libres
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          {ocu} ocupados
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Detalle de zona ──────────────────────────────────────────── */}
        {zonaSeleccionada && (
          <div className="space-y-4 py-2">
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 -ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => { setZonaSeleccionada(null); setImgError(false) }}
            >
              <ChevronLeft className="w-4 h-4" />
              Todas las zonas
            </Button>

            {/* Imagen grande con overlay */}
            {imagen && !imgError && (
              <div className="relative w-full h-52 rounded-xl overflow-hidden bg-muted">
                <Image
                  src={imagen}
                  alt={label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 700px"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <p className="text-xl font-bold drop-shadow">{label}</p>
                  {descZona && (
                    <p className="text-xs text-white/80 drop-shadow max-w-sm line-clamp-2">{descZona}</p>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                {libres} libre{libres !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                {ocupados} ocupado{ocupados !== 1 ? "s" : ""}
              </span>
              {zonaSeleccionada.isBlocked && (
                <Badge variant="destructive" className="text-xs">
                  {zonaSeleccionada.eventName ? `Bloqueada: ${zonaSeleccionada.eventName}` : "Bloqueada"}
                </Badge>
              )}
            </div>

            {/* Grid asientos */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SeatGrid seats={zonaSeleccionada.seats} isBlocked={zonaSeleccionada.isBlocked} />
            </div>

            <SeatLegend />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
