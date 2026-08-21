"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Map } from "lucide-react"

interface MapaModalProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
}

export function MapaModal({ open, onOpenChange }: MapaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Mapa del Coworking
          </DialogTitle>
          <DialogDescription>
            Plano de referencia — Planta 1
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 rounded-lg p-4 min-h-0">
          <img
            src="/NODO-PLANO-P1.svg"
            alt="Plano planta 1 del coworking"
            className="max-w-full max-h-full object-contain"
            style={{ transform: "rotate(90deg)" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
