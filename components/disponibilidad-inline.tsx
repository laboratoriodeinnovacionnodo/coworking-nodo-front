"use client"

import { useState, useEffect, useCallback } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
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
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DisponibilidadInlineProps {
  onSuccess?: () => void
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  })
}

function esHoy(iso: string): boolean {
  const hoy = new Date()
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  const f = new Date(y, m - 1, d)
  return f.getDate() === hoy.getDate() && f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
}

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(false)
  const [liberando,   setLiberando]   = useState<number | null>(null)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      // Usa el endpoint /activas — solo las vigentes desde hoy
      const data = await ocupacionesApi.getActivas()
      setOcupaciones(data)
    } catch {
      if (!silencioso) toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [toast])

  useEffect(() => { cargar() }, [cargar])

  const liberar = async (oc: Ocupacion) => {
    setLiberando(oc.id)
    try {
      await ocupacionesApi.liberar(oc.id)
      toast({ title: "✅ Zonas liberadas", description: `"${oc.titulo}" finalizada` })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Error" })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id)

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando ocupaciones...</span>
      </div>
    )
  }

  if (ocupaciones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Inbox className="w-7 h-7 opacity-50" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Sin ocupaciones activas</p>
          <p className="text-xs opacity-60 mt-0.5">Todas las áreas están disponibles</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => cargar()} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">
            {ocupaciones.length} ocupación{ocupaciones.length !== 1 ? "es" : ""} activa{ocupaciones.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            · {ocupaciones.reduce((a, o) => a + o.areas.length, 0)} zona{ocupaciones.reduce((a, o) => a + o.areas.length, 0) !== 1 ? "s" : ""} ocupada{ocupaciones.reduce((a, o) => a + o.areas.length, 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cargar()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {ocupaciones.map((oc) => {
          const hoy      = esHoy(oc.fechaDesde)
          const multidia = oc.fechaDesde.split("T")[0] !== oc.fechaHasta.split("T")[0]
          const expanded = expandedId === oc.id

          return (
            <div
              key={oc.id}
              className={cn(
                "rounded-xl border border-l-4 border-l-primary bg-white shadow-sm overflow-hidden",
                hoy && "ring-1 ring-primary/20",
              )}
            >
              {/* Header clickeable */}
              <button
                type="button"
                onClick={() => toggleExpand(oc.id)}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{oc.titulo}</p>
                    {hoy && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {formatFecha(oc.fechaDesde)}
                      {multidia && <> → {formatFecha(oc.fechaHasta)}</>}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {oc.horaDesde} – {oc.horaHasta}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {oc.cantidadPersonas} personas
                    </span>
                  </div>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />}
              </button>

              {/* Detalle expandible */}
              {expanded && (
                <div className="border-t px-4 py-3 space-y-3 bg-muted/10">
                  {/* Organizador */}
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Organizador:</span>
                    <span className="font-medium text-foreground">{oc.organizador}</span>
                  </div>

                  {/* Áreas */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> Áreas ocupadas:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {oc.areas.length > 0
                        ? oc.areas.map((r) => (
                            <Badge key={r.areaId} variant="secondary" className="text-xs">
                              {r.area.nombre}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">Sin zonas</span>
                      }
                    </div>
                  </div>

                  {/* Requerimiento */}
                  {oc.requerimiento && (
                    <p className="text-xs text-muted-foreground border-t pt-2">{oc.requerimiento}</p>
                  )}

                  {/* Anexos */}
                  {oc.anexos?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Anexos:
                      </p>
                      {oc.anexos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary underline truncate block">
                          {url}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Acción liberar */}
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => liberar(oc)}
                      disabled={liberando === oc.id}
                    >
                      {liberando === oc.id
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Liberando...</>
                        : <><Unlock className="w-3 h-3" /> Liberar áreas</>
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
