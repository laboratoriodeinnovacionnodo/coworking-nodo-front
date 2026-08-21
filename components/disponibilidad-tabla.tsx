"use client"

import { useState, useEffect, useCallback } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Unlock,
  RefreshCw,
  Inbox,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface DisponibilidadTablaProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

export function DisponibilidadTabla({ open, onOpenChange, onSuccess }: DisponibilidadTablaProps) {
  const { toast } = useToast()
  const [ocupaciones,  setOcupaciones]  = useState<Ocupacion[]>([])
  const [loading,      setLoading]      = useState(false)
  const [liberando,    setLiberando]    = useState<number | null>(null)
  const [expandedId,   setExpandedId]   = useState<number | null>(null)

  // ── Carga ────────────────────────────────────────────────────
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const data = await ocupacionesApi.getAll()
      // Solo las activas (sin liberadaAt)
      setOcupaciones(data.filter((o) => !o.liberadaAt))
    } catch {
      if (!silencioso) toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) cargar()
  }, [open, cargar])

  // ── Liberar ──────────────────────────────────────────────────
  const liberar = async (ocupacion: Ocupacion) => {
    setLiberando(ocupacion.id)
    try {
      await ocupacionesApi.liberar(ocupacion.id)
      toast({
        title: "✅ Zonas liberadas",
        description: `"${ocupacion.titulo}" finalizada — áreas marcadas como LIBRE`,
      })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al liberar", description: msg })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id)

  // ── Helpers ──────────────────────────────────────────────────
  const formatFecha = (dia: string, hora: string) => {
    try {
      const [y, m, d] = dia.split("-")
      return `${d}/${m}/${y} ${hora}`
    } catch {
      return `${dia} ${hora}`
    }
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Disponibilidad de Zonas
              </DialogTitle>
              <DialogDescription>
                Ocupaciones activas — liberá zonas cuando terminen
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => cargar()}
              disabled={loading}
              className="flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando ocupaciones...</span>
            </div>
          ) : ocupaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Inbox className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No hay zonas ocupadas en este momento</p>
              <p className="text-xs opacity-60">Todas las áreas están disponibles</p>
            </div>
          ) : (
            <>
              {/* ── Desktop: tabla ─────────────────────────────── */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Organizador</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Fecha / Hora</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Personas</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Zonas</span>
                      </TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocupaciones.map((oc) => (
                      <>
                        <TableRow
                          key={oc.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleExpand(oc.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {expandedId === oc.id
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                              {oc.titulo}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{oc.organizador}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {formatFecha(oc.dia, oc.hora)}
                            </span>
                          </TableCell>
                          <TableCell>{oc.cantidadPersonas}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {oc.areas.length > 0
                                ? oc.areas.map((r) => (
                                    <Badge key={r.areaId} variant="secondary" className="text-xs">
                                      {r.area.nombre}
                                    </Badge>
                                  ))
                                : <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs border-green-300 text-green-700 hover:bg-green-50"
                              disabled={liberando === oc.id}
                              onClick={(e) => { e.stopPropagation(); liberar(oc) }}
                            >
                              {liberando === oc.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Unlock className="w-3.5 h-3.5" />}
                              Liberar
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Fila expandida: requerimiento + rango edad + anexos */}
                        {expandedId === oc.id && (
                          <TableRow key={`exp-${oc.id}`} className="bg-muted/20">
                            <TableCell colSpan={6} className="py-3">
                              <div className="space-y-2 text-sm pl-5">
                                <p><span className="font-medium text-foreground">Requerimiento:</span>{" "}
                                  <span className="text-muted-foreground">{oc.requerimiento}</span>
                                </p>
                                {(oc.edadMin != null || oc.edadMax != null) && (
                                  <p><span className="font-medium text-foreground">Rango de edad:</span>{" "}
                                    <span className="text-muted-foreground">
                                      {oc.edadMin ?? "?"} — {oc.edadMax ?? "?"} años
                                    </span>
                                  </p>
                                )}
                                {oc.anexos.length > 0 && (
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className="font-medium text-foreground">Anexos:</span>
                                    {oc.anexos.map((url, i) => (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-primary hover:underline text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Link2 className="w-3 h-3" />
                                        Anexo {i + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile: cards ──────────────────────────────── */}
              <div className="md:hidden space-y-3 p-1">
                {ocupaciones.map((oc) => (
                  <div key={oc.id} className="border rounded-xl p-4 bg-card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{oc.titulo}</p>
                        <p className="text-xs text-muted-foreground">{oc.organizador}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs flex-shrink-0 border-green-300 text-green-700 hover:bg-green-50"
                        disabled={liberando === oc.id}
                        onClick={() => liberar(oc)}
                      >
                        {liberando === oc.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Unlock className="w-3 h-3" />}
                        Liberar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatFecha(oc.dia, oc.hora)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {oc.cantidadPersonas} personas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {oc.areas.length > 0
                        ? oc.areas.map((r) => (
                            <Badge key={r.areaId} variant="secondary" className="text-xs">
                              {r.area.nombre}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">Sin zonas asignadas</span>}
                    </div>

                    {oc.requerimiento && (
                      <p className="text-xs text-muted-foreground border-t pt-2 line-clamp-2">
                        {oc.requerimiento}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer: resumen */}
        {ocupaciones.length > 0 && (
          <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
            <span>{ocupaciones.length} ocupación{ocupaciones.length !== 1 ? "es" : ""} activa{ocupaciones.length !== 1 ? "s" : ""}</span>
            <span>
              {ocupaciones.reduce((acc, o) => acc + o.areas.length, 0)} zona{ocupaciones.reduce((acc, o) => acc + o.areas.length, 0) !== 1 ? "s" : ""} ocupada{ocupaciones.reduce((acc, o) => acc + o.areas.length, 0) !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
