"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 }      from "lucide-react"
import { reservasApi }  from "@/lib/api"
import { useToast }     from "@/hooks/use-toast"
import type { BackendReserva } from "@/types/seat"

// ── Tipos de recepción alineados con el backend ───────────────────────────────
type Recepcion = "MANANA" | "INTERMEDIO" | "TARDE"

const RECEPCION_LABELS: Record<Recepcion, string> = {
  MANANA:     "Mañana",
  INTERMEDIO: "Intermedio",
  TARDE:      "Tarde",
}

interface EditarReservaModalProps {
  reserva:      BackendReserva | null
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

export function EditarReservaModal({
  reserva,
  open,
  onOpenChange,
  onSuccess,
}: EditarReservaModalProps) {
  const { toast } = useToast()

  const [nombre,    setNombre]    = useState("")
  const [detalles,  setDetalles]  = useState("")
  const [recepcion, setRecepcion] = useState<Recepcion>("MANANA")
  const [guardando, setGuardando] = useState(false)

  // Sincronizar campos cuando cambia la reserva
  useEffect(() => {
    if (reserva) {
      setNombre(reserva.nombre ?? "")
      setDetalles(reserva.detalles ?? "")
      setRecepcion((reserva.recepcion as Recepcion) ?? "MANANA")
    }
  }, [reserva])

  const handleGuardar = async () => {
    if (!reserva) return
    if (!nombre.trim()) {
      toast({ variant: "destructive", title: "El nombre es obligatorio" })
      return
    }

    setGuardando(true)
    try {
      await reservasApi.update(reserva.id, {
        nombre:    nombre.trim(),
        detalles:  detalles.trim() || undefined,
        recepcion,
      })
      toast({ title: "✅ Reserva actualizada", description: `${reserva.area?.nombre ?? "Área"} editada correctamente` })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setGuardando(false)
    }
  }

  if (!reserva) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl p-5">
        <DialogHeader>
          <DialogTitle className="text-lg">Editar reserva</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {reserva.area?.nombre ?? `Reserva #${reserva.id}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="er-nombre" className="text-sm">Nombre</Label>
            <Input
              id="er-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del cliente"
              className="text-sm"
            />
          </div>

          {/* Turno de recepción */}
          <div className="space-y-1.5">
            <Label htmlFor="er-recepcion" className="text-sm">Turno de recepción</Label>
            <Select value={recepcion} onValueChange={(v) => setRecepcion(v as Recepcion)}>
              <SelectTrigger id="er-recepcion" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RECEPCION_LABELS) as Recepcion[]).map((key) => (
                  <SelectItem key={key} value={key}>{RECEPCION_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detalles */}
          <div className="space-y-1.5">
            <Label htmlFor="er-detalles" className="text-sm">Detalles <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              id="er-detalles"
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Información adicional"
              className="text-sm"
            />
          </div>

        </div>

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
            className="text-sm bg-transparent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={guardando || !nombre.trim()}
            className="text-sm gap-1.5"
          >
            {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
