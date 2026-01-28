"use client"

import { useState } from "react"
import type { Seat, SeatStatus } from "@/types/seat"
import { seatStatusLabels, canOccupySeat } from "@/lib/seat-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface SeatStatusModalProps {
  seat: Seat | null
  open: boolean
  onClose: () => void
  onUpdateStatus: (
    seatId: string,
    status: SeatStatus,
    userName?: string,
    shareLimit?: number,
    peopleCount?: number,
  ) => void
  isAdmin?: boolean
}

export function SeatStatusModal({ seat, open, onClose, onUpdateStatus, isAdmin = false }: SeatStatusModalProps) {
  const [userName, setUserName] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<SeatStatus>("occupied")
  const [shareLimit, setShareLimit] = useState("2")
  const [peopleCount, setPeopleCount] = useState("1")

  if (!seat) return null

  const handleOccupySeat = () => {
    if (userName.trim()) {
      const limit = selectedStatus === "for-share" ? Number.parseInt(shareLimit) : undefined
      const count = Number.parseInt(peopleCount)
      onUpdateStatus(seat.id, selectedStatus, userName, limit, count)
      setUserName("")
      setSelectedStatus("occupied")
      setShareLimit("2")
      setPeopleCount("1")
      onClose()
    }
  }

  const handleFreeSeat = () => {
    onUpdateStatus(seat.id, "available")
    onClose()
  }

  const handleAdminUpdate = () => {
    onUpdateStatus(seat.id, selectedStatus)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-lg md:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">{seat.id}</DialogTitle>
          <DialogDescription>
            {seat.zone && <span className="block text-sm md:text-base font-medium">{seat.zone}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {seat.image && (
            <div className="w-full h-40 md:h-48 rounded-lg overflow-hidden bg-muted">
              <img src={seat.image || "/placeholder.svg"} alt={seat.id} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs md:text-sm text-muted-foreground">Estado</div>
              <div className="text-sm md:text-base font-semibold">{seatStatusLabels[seat.status]}</div>
            </div>
            {seat.capacity && (
              <div>
                <div className="text-xs md:text-sm text-muted-foreground">Capacidad</div>
                <div className="text-sm md:text-base font-semibold">{seat.capacity} personas</div>
              </div>
            )}
            {seat.zone && (
              <div className="col-span-1 sm:col-span-2">
                <div className="text-xs md:text-sm text-muted-foreground">Zona</div>
                <div className="text-sm md:text-base font-semibold">{seat.zone}</div>
              </div>
            )}
          </div>

          {seat.amenities && seat.amenities.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm md:text-base mb-2">Comodidades</h3>
              <div className="flex flex-wrap gap-2">
                {seat.amenities.map((amenity, idx) => (
                  <div key={idx} className="px-3 py-1 bg-primary/10 rounded-full text-xs md:text-sm">
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          {seat.status !== "available" && seat.status !== "out-of-service" && (
            <div className="p-3 md:p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-sm md:text-base mb-3">Información de Reserva</h3>
              <div className="space-y-2 text-sm md:text-base">
                {seat.userName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reservado por:</span>
                    <span className="font-medium">{seat.userName}</span>
                  </div>
                )}
                {seat.occupiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desde:</span>
                    <span className="font-medium">
                      {seat.occupiedAt.toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
                {(seat.status === "for-share" || seat.status === "shared") && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Personas:</span>
                      <span className="font-medium">
                        {seat.peopleCount || 0}/{seat.shareLimit || 0}
                      </span>
                    </div>
                    {seat.sharedUsers && seat.sharedUsers.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Compartido por:</span>
                        <div className="mt-1 space-y-1">
                          {seat.sharedUsers.map((user, idx) => (
                            <div key={idx} className="text-xs md:text-sm font-medium pl-2">
                              • {user}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {seat.mapPdfUrl && (
            <Button variant="outline" className="w-full bg-transparent text-xs md:text-sm" asChild>
              <a href={seat.mapPdfUrl} target="_blank" rel="noopener noreferrer">
                Ver Mapa Completo del Coworking (PDF)
              </a>
            </Button>
          )}

          {!isAdmin && canOccupySeat(seat.status) && (
            <div className="space-y-4 p-3 md:p-4 bg-card border rounded-lg">
              <h3 className="font-semibold text-sm md:text-base">Crear Reserva</h3>
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-xs md:text-sm">Tu nombre</Label>
                <Input
                  id="userName"
                  placeholder="Ingresa tu nombre"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peopleCount" className="text-xs md:text-sm">Número de personas</Label>
                <Input
                  id="peopleCount"
                  type="number"
                  min="1"
                  max="10"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignStatus" className="text-xs md:text-sm">Estado del área</Label>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as SeatStatus)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{seatStatusLabels["available"]}</SelectItem>
                    <SelectItem value="occupied">{seatStatusLabels["occupied"]}</SelectItem>
                    <SelectItem value="out-of-service">{seatStatusLabels["out-of-service"]}</SelectItem>
                    <SelectItem value="cleaning">{seatStatusLabels["cleaning"]}</SelectItem>
                    <SelectItem value="for-share">{seatStatusLabels["for-share"]}</SelectItem>
                    <SelectItem value="shared">{seatStatusLabels["shared"]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedStatus === "for-share" && (
                <div className="space-y-2">
                  <Label htmlFor="shareLimit" className="text-xs md:text-sm">Límite de personas</Label>
                  <Input
                    id="shareLimit"
                    type="number"
                    min="2"
                    max="10"
                    value={shareLimit}
                    onChange={(e) => setShareLimit(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
              <Button onClick={handleOccupySeat} className="w-full text-sm" disabled={!userName.trim()}>
                Asignar asiento
              </Button>
            </div>
          )}

          {!isAdmin && seat.status !== "available" && seat.status !== "out-of-service" && (
            <Button onClick={handleFreeSeat} variant="destructive" className="w-full text-sm">
              Liberar asiento
            </Button>
          )}

          {isAdmin && (
            <div className="space-y-4 p-3 md:p-4 bg-card border rounded-lg">
              <h3 className="font-semibold text-sm md:text-base">Modo Administrador</h3>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs md:text-sm">Cambiar estado del área</Label>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as SeatStatus)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(seatStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdminUpdate} className="w-full text-sm">
                Actualizar estado
              </Button>
            </div>
          )}

          {(seat.status === "available" || seat.status === "for-share") && !isAdmin && (
            <div className="p-3 md:p-4 bg-primary/10 border border-primary/30 rounded-lg text-center">
              <p className="font-semibold text-sm md:text-base mb-1">Este espacio está disponible</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Acércate a recepción para ocupar este lugar o completa el formulario arriba.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="text-sm bg-transparent">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
