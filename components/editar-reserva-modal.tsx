"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Sun, Sunset, Moon, Mail } from "lucide-react"
import { reservasApi }               from "@/lib/api"
import { useToast }                  from "@/hooks/use-toast"
import type { BackendReserva, Recepcion } from "@/types/seat"
import { RECEPCION_LABELS }              from "@/types/seat"

const RECEPCION_ICONS: Record<Recepcion, React.ElementType> = {
  MANANA:     Sun,
  INTERMEDIO: Sunset,
  TARDE:      Moon,
}

interface EditarReservaModalProps {
  reserva:      BackendReserva | null
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

export function EditarReservaModal({
  reserva, open, onOpenChange, onSuccess,
}: EditarReservaModalProps) {
  const { toast } = useToast()

  const [nombre,    setNombre]    = useState("")
  const [gmail,     setGmail]     = useState("")
  const [receptor,  setReceptor]  = useState("")
  const [detalles,  setDetalles]  = useState("")
  const [recepcion, setRecepcion] = useState<Recepcion>("MANANA")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (reserva) {
      setNombre(reserva.nombre ?? "")
      setGmail(reserva.gmail ?? "")
      setReceptor(reserva.receptor ?? "")
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
        gmail:     gmail.trim()    || undefined,
        receptor:  receptor.trim() || undefined,
        detalles:  detalles.trim() || undefined,
        recepcion,
      })
      toast({ title: "✅ Reserva actualizada", description: `${reserva.area?.nombre ?? "Área"} editada correctamente` })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Error al guardar" })
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

          {/* Gmail — arriba */}
          <div className="space-y-1.5">
            <Label htmlFor="er-gmail" className="text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Gmail <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="er-gmail"
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="cliente@gmail.com"
              className="text-sm"
            />
          </div>

          {/* Nombre del cliente */}
          <div className="space-y-1.5">
            <Label htmlFor="er-nombre" className="text-sm">Nombre del cliente</Label>
            <Input
              id="er-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del cliente"
              className="text-sm"
            />
          </div>

          {/* Detalles */}
          <div className="space-y-1.5">
            <Label htmlFor="er-detalles" className="text-sm">
              Detalles <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="er-detalles"
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Información adicional"
              className="text-sm"
            />
          </div>

          {/* Receptor — abajo */}
          <div className="space-y-1.5">
            <Label htmlFor="er-receptor" className="text-sm">
              Nombre del receptor <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="er-receptor"
              value={receptor}
              onChange={(e) => setReceptor(e.target.value)}
              placeholder="¿Quién lo recibe en recepción?"
              className="text-sm"
            />
          </div>

          {/* Turno — abajo */}
          <div className="space-y-1.5">
            <Label htmlFor="er-recepcion" className="text-sm">Turno de recepción</Label>
            <Select value={recepcion} onValueChange={(v) => setRecepcion(v as Recepcion)}>
              <SelectTrigger id="er-recepcion" className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RECEPCION_LABELS) as Recepcion[]).map((key) => {
                  const Icon = RECEPCION_ICONS[key]
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {RECEPCION_LABELS[key]}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando} className="text-sm bg-transparent">
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={guardando || !nombre.trim()} className="text-sm gap-1.5">
            {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
