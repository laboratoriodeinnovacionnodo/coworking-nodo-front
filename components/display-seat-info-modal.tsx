"use client"

import type { Seat } from "@/types/seat"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Armchair, Users, MapPin, Map, Wifi, Monitor, ExternalLink, Zap } from 'lucide-react'
import { seatStatusColors } from "@/lib/seat-utils"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface DisplaySeatInfoModalProps {
  seat: Seat | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisplaySeatInfoModal({
  seat,
  open,
  onOpenChange,
}: DisplaySeatInfoModalProps) {
  if (!seat) return null

  const getStatusLabel = (status: Seat["status"]) => {
    switch (status) {
      case "available":
        return "Libre"
      case "occupied":
        return "Ocupado"
      case "out-of-service":
        return "Fuera de servicio"
      case "cleaning":
        return "Limpiando"
      case "for-share":
        return "Para compartir"
      case "shared":
        return "Compartido"
      default:
        return ""
    }
  }

  const getStatusColor = (status: Seat["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "occupied":
        return "bg-red-500"
      case "out-of-service":
        return "bg-gray-500"
      case "cleaning":
        return "bg-blue-500"
      case "for-share":
        return "bg-yellow-500"
      case "shared":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getAmenityIcon = (amenity: string) => {
    if (amenity.toLowerCase().includes('monitor')) return <Monitor className="w-4 h-4" />
    if (amenity.toLowerCase().includes('wifi') || amenity.toLowerCase().includes('internet')) return <Wifi className="w-4 h-4" />
    if (amenity.toLowerCase().includes('enchufe') || amenity.toLowerCase().includes('usb')) return <Zap className="w-4 h-4" />
    return <Armchair className="w-4 h-4" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className={cn(
              "p-3 rounded-xl flex items-center justify-center",
              seatStatusColors[seat.status]
            )}>
              {(seat.status === "for-share" || seat.status === "shared") && seat.peopleCount ? (
                <Users className="w-6 h-6" />
              ) : (
                <Armchair className="w-6 h-6" />
              )}
            </div>
            Asiento {seat.id}
          </DialogTitle>
          <DialogDescription>
            Información completa del espacio de trabajo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {seat.image && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
              <Image
                src={seat.image || "/placeholder.svg"}
                alt={`Asiento ${seat.id}`}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Estado y Zona */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground block mb-2">Estado actual:</span>
              <Badge className={cn(getStatusColor(seat.status), "text-white text-sm")}>
                {getStatusLabel(seat.status)}
              </Badge>
            </div>
            {seat.zone && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground block mb-2">Zona:</span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{seat.zone}</span>
                </div>
              </div>
            )}
          </div>

          {seat.capacity && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground block mb-2">Capacidad máxima:</span>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold text-lg">{seat.capacity} {seat.capacity === 1 ? 'persona' : 'personas'}</span>
              </div>
            </div>
          )}

          {seat.amenities && seat.amenities.length > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground block mb-3">Comodidades:</span>
              <div className="grid grid-cols-2 gap-2">
                {seat.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getAmenityIcon(amenity)}
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Información de ocupación */}
          {seat.status !== "available" && seat.status !== "out-of-service" && (
            <>
              {seat.userName && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Ocupado por:</span>
                  <span className="font-semibold">{seat.userName}</span>
                </div>
              )}

              {seat.peopleCount && seat.peopleCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Personas actuales:</span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">
                      {seat.peopleCount}
                      {seat.shareLimit && ` / ${seat.shareLimit}`}
                    </span>
                  </div>
                </div>
              )}

              {seat.sharedUsers && seat.sharedUsers.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <span className="text-sm font-medium text-muted-foreground block">Compartido por:</span>
                  <ul className="space-y-1">
                    {seat.sharedUsers.map((person, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {person}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {seat.mapPdfUrl && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(seat.mapPdfUrl, '_blank')}
            >
              <Map className="w-4 h-4 mr-2" />
              Ver mapa completo del coworking
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          )}

          {/* Mensaje de invitación para asientos libres */}
          {seat.status === "available" && (
            <div className="mt-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2 text-balance">¡Este asiento está disponible!</h4>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                    Acércate a recepción y ocupa el lugar que más te guste. 
                    {seat.zone && ` Este espacio se encuentra en ${seat.zone}.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje para asientos para compartir */}
          {seat.status === "for-share" && seat.shareLimit && seat.peopleCount && seat.peopleCount < seat.shareLimit && (
            <div className="mt-6 p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl border-2 border-yellow-500/20">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2 text-balance">¡Espacio disponible para compartir!</h4>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                    Hay lugar para {seat.shareLimit - seat.peopleCount} persona{seat.shareLimit - seat.peopleCount !== 1 ? 's' : ''} más. 
                    Acércate a recepción para unirte a este espacio colaborativo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
