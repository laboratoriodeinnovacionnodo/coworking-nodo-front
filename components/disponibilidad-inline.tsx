"use client"

import { useState, useEffect, useCallback } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Clock,
  Users,
  Unlock,
  RefreshCw,
  Inbox,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface DisponibilidadInlineProps {
  onSuccess?: () => void
}

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(true)
  const [liberando,   setLiberando]   = useState<number | null>(null)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  // ── Carga ────────────────────────────────────────────────────
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const data = await ocupacionesApi.getAll()
      setOcupaciones(data.filter((o) => !o.liberadaAt))
    } catch {
      if (!silencioso)
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [toast])

  useEffect(() => { cargar() }, [cargar])

  // ── Liberar ──────────────────────────────────────────────────
  const liberar = async (oc: Ocupacion) => {
    setLiberando(oc.id)
    try {
      await ocupacionesApi.liberar(oc.id)
      toast({
        title:       "✅ Zonas liberadas",
        description: `"${oc.titulo}" finalizada — áreas marcadas como LIBRE`,
      })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      toast({
        variant:     "destructive",
        title:       "Error al liberar",
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) =>
    setExpandedId(expandedId === id ? null : id)

  const formatFecha = (dia: string, hora: string) => {
    try {
      const [y, m, d] = dia.split("-")
      return `${d}/${m}/${y} ${hora}`
    } catch {
      return `${dia} ${hora}`
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando ocupaciones...</span>
      </div>
    )
  }

  // ── Vacío ────────────────────────────────────────────────────
  if (ocupaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
        <Inbox className="w-10 h-10 opacity-25" />
        <p className="text-sm font-medium">No hay zonas ocupadas</p>
        <p className="text-xs opacity-60">Todas las áreas están disponibles</p>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 mt-1"
          onClick={() => cargar()}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </Button>
      </div>
    )
  }

  // ── Tabla ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Encabezado de sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span>
            <span className="font-semibold text-foreground">{ocupaciones.length}</span>{" "}
            ocupación{ocupaciones.length !== 1 ? "es" : ""} activa{ocupaciones.length !== 1 ? "s" : ""}
            {" · "}
            <span className="font-semibold text-foreground">
              {ocupaciones.reduce((a, o) => a + o.areas.length, 0)}
            </span>{" "}
            zona{ocupaciones.reduce((a, o) => a + o.areas.length, 0) !== 1 ? "s" : ""} ocupada{ocupaciones.reduce((a, o) => a + o.areas.length, 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cargar()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* ── Desktop: tabla ──────────────────────────────────── */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Título</TableHead>
              <TableHead className="text-xs">Organizador</TableHead>
              <TableHead className="text-xs">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Fecha / Hora</span>
              </TableHead>
              <TableHead className="text-xs">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Personas</span>
              </TableHead>
              <TableHead className="text-xs">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zonas</span>
              </TableHead>
              <TableHead className="text-right text-xs">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ocupaciones.map((oc) => (
              <>
                <TableRow
                  key={oc.id}
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => toggleExpand(oc.id)}
                >
                  <TableCell className="font-medium text-sm">
                    <span className="flex items-center gap-1.5">
                      {expandedId === oc.id
                        ? <ChevronUp   className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      {oc.titulo}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{oc.organizador}</TableCell>
                  <TableCell className="text-sm">{formatFecha(oc.dia, oc.hora)}</TableCell>
                  <TableCell className="text-sm">{oc.cantidadPersonas}</TableCell>
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
                      className="gap-1.5 text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                      disabled={liberando === oc.id}
                      onClick={(e) => { e.stopPropagation(); liberar(oc) }}
                    >
                      {liberando === oc.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Unlock  className="w-3 h-3" />}
                      Liberar
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Fila expandida */}
                {expandedId === oc.id && (
                  <TableRow key={`exp-${oc.id}`} className="bg-muted/10">
                    <TableCell colSpan={6} className="py-3">
                      <div className="space-y-1.5 text-sm pl-5">
                        <p>
                          <span className="font-medium">Requerimiento: </span>
                          <span className="text-muted-foreground">{oc.requerimiento}</span>
                        </p>
                        {(oc.edadMin != null || oc.edadMax != null) && (
                          <p>
                            <span className="font-medium">Rango de edad: </span>
                            <span className="text-muted-foreground">
                              {oc.edadMin ?? "?"} — {oc.edadMax ?? "?"} años
                            </span>
                          </p>
                        )}
                        {oc.anexos.length > 0 && (
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="font-medium">Anexos:</span>
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

      {/* ── Mobile: cards ───────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {ocupaciones.map((oc) => (
          <div key={oc.id} className="border rounded-xl p-3 bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{oc.titulo}</p>
                <p className="text-xs text-muted-foreground">{oc.organizador}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs flex-shrink-0 h-7 border-green-300 text-green-700 hover:bg-green-50"
                disabled={liberando === oc.id}
                onClick={() => liberar(oc)}
              >
                {liberando === oc.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Unlock  className="w-3 h-3" />}
                Liberar
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{formatFecha(oc.dia, oc.hora)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />{oc.cantidadPersonas} personas
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {oc.areas.length > 0
                ? oc.areas.map((r) => (
                    <Badge key={r.areaId} variant="secondary" className="text-xs">
                      {r.area.nombre}
                    </Badge>
                  ))
                : <span className="text-xs text-muted-foreground">Sin zonas</span>}
            </div>

            {oc.requerimiento && (
              <p className="text-xs text-muted-foreground border-t pt-2 line-clamp-2">
                {oc.requerimiento}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
