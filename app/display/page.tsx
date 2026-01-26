"use client"

import { useState, useEffect } from "react"
import type { Seat } from "@/types/seat"
import { useSeats } from "@/hooks/use-seats"
import { DisplaySeatGrid } from "@/components/display-seat-grid"
import { DisplaySeatInfoModal } from "@/components/display-seat-info-modal"
import { SeatLegend } from "@/components/seat-legend"
import { Card } from "@/components/ui/card"
import { Monitor, Loader2 } from "lucide-react"

export default function DisplayPage() {
  const { seats, loading, fetchSeats } = useSeats()

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSeats()
      setLastUpdate(new Date())
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchSeats])

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat)
    setModalOpen(true)
  }

  if (loading && seats.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando asientos del backend...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Monitor className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-balance">Monitor de Asientos</h1>
              <p className="text-muted-foreground">Vista en tiempo real del coworking</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Última actualización</p>
            <p className="text-sm font-medium">{lastUpdate.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Leyenda */}
        <Card className="p-6">
          <SeatLegend />
        </Card>

        {/* Grid de asientos */}
        <Card className="p-6">
          <DisplaySeatGrid seats={seats} onSeatClick={handleSeatClick} />
        </Card>

        {/* Estadísticas */}
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {seats.filter((s) => s.status === "available").length}
              </p>
              <p className="text-sm text-muted-foreground">Libres</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{seats.filter((s) => s.status === "occupied").length}</p>
              <p className="text-sm text-muted-foreground">Ocupados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {seats.filter((s) => s.status === "out-of-service").length}
              </p>
              <p className="text-sm text-muted-foreground">Fuera de servicio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{seats.filter((s) => s.status === "cleaning").length}</p>
              <p className="text-sm text-muted-foreground">Limpiando</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {seats.filter((s) => s.status === "for-share").length}
              </p>
              <p className="text-sm text-muted-foreground">Para compartir</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{seats.filter((s) => s.status === "shared").length}</p>
              <p className="text-sm text-muted-foreground">Compartidos</p>
            </div>
          </div>
        </Card>
      </div>

      <DisplaySeatInfoModal seat={selectedSeat} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
