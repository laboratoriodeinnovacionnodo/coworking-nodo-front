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
import { Armchair, ImageIcon, ChevronLeft, CheckCircle2, XCircle } from "lucide-react"

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

  const zonas    = agruparPorZona(seats, isBlocked, eventoTitulo)
  const libres   = zonaSeleccionada?.seats.filter((s) => s.status === "available").length ?? 0
  const ocupados = zonaSeleccionada?.seats.filter((s) => s.status === "occupied").length  ?? 0
  const imagen   = zonaSeleccionada ? getAreaImage(zonaSeleccionada.letra) : null
  const label    = zonaSeleccionada ? getAreaLabel(zonaSeleccionada.letra) : ""
  const descZona = zonaSeleccionada?.seats[0]?.amenities?.[0] ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Armchair className="w-5 h-5 text-primary" />
            {zonaSeleccionada ? label : "Asientos / Mapa"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            {zonaSeleccionada
              ? `${libres} libre${libres !== 1 ? "s" : ""} · ${ocupados} ocupado${ocupados !== 1 ? "s" : ""}`
              : "Seleccioná una zona para ver el estado de sus asientos"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Vista: grilla de zonas ───────────────────────────────── */}
        {!zonaSeleccionada && (
          <div className="space-y-4 py-1">

            <SeatLegend />

            {isBlocked && eventoTitulo && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-sm">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span><span className="font-semibold">Evento activo:</span> {eventoTitulo}</span>
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

                return (
                  <button
                    key={zona.letra}
                    type="button"
                    onClick={() => { setImgError(false); setZonaSeleccionada(zona) }}
                    className="group text-left rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)] hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all overflow-hidden"
                  >
                    {/* Imagen */}
                    <div className="relative w-full h-36 bg-slate-100 overflow-hidden">
                      {img ? (
                        <Image
                          src={img}
                          alt={lbl}
                          fill
                          className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                          <ImageIcon className="w-7 h-7" />
                          <span className="text-xs">Sin imagen</span>
                        </div>
                      )}
                      {/* Label sobre imagen */}
                      <div className="absolute top-2.5 left-3">
                        <span className="text-base font-bold text-white drop-shadow-sm">{lbl}</span>
                      </div>
                      {/* Badge estado */}
                      <div className="absolute top-2.5 right-2.5">
                        {zona.isBlocked ? (
                          <span className="text-[10px] font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full">Bloqueada</span>
                        ) : ocu === total && total > 0 ? (
                          <span className="text-[10px] font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">Llena</span>
                        ) : lib === total ? (
                          <span className="text-[10px] font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full">Libre</span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-yellow-500 text-white px-2 py-0.5 rounded-full">Parcial</span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 space-y-2">
                      {/* Barra */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === 100 ? "bg-red-400" : pct > 50 ? "bg-yellow-400" : "bg-green-400"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Contadores */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {lib} libres
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
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

        {/* ── Vista: detalle de zona ───────────────────────────────── */}
        {zonaSeleccionada && (
          <div className="space-y-4 py-1">

            {/* Botón volver */}
            <button
              type="button"
              onClick={() => { setZonaSeleccionada(null); setImgError(false) }}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors -ml-0.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Todas las zonas
            </button>

            {/* Imagen grande */}
            {imagen && !imgError && (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-slate-100">
                <Image
                  src={imagen}
                  alt={label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 700px"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3.5 left-4">
                  <p className="text-xl font-bold text-white drop-shadow">{label}</p>
                  {descZona && (
                    <p className="text-xs text-white/75 max-w-sm line-clamp-2 mt-0.5">{descZona}</p>
                  )}
                </div>
              </div>
            )}

            {/* Stats: 3 pills limpias */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-semibold text-slate-700">{libres}</span>
                <span className="text-slate-400">libre{libres !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="font-semibold text-slate-700">{ocupados}</span>
                <span className="text-slate-400">ocupado{ocupados !== 1 ? "s" : ""}</span>
              </div>
              {zonaSeleccionada.isBlocked && (
                <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5 text-sm text-orange-700">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  {zonaSeleccionada.eventName
                    ? `Bloqueada: ${zonaSeleccionada.eventName}`
                    : "Bloqueada por evento"}
                </div>
              )}
            </div>

            {/* Grid de asientos */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <SeatGrid seats={zonaSeleccionada.seats} isBlocked={zonaSeleccionada.isBlocked} />
            </div>

            <SeatLegend />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
