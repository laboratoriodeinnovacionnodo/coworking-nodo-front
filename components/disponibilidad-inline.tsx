"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  return (
    f.getDate()     === hoy.getDate()  &&
    f.getMonth()    === hoy.getMonth() &&
    f.getFullYear() === hoy.getFullYear()
  )
}

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  // ✅ FIX: toast en ref → no entra en el dep array de useCallback → sin loops
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(false)
  const [liberando,   setLiberando]   = useState<number | null>(null)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  // ✅ FIX: dep array estable → useEffect se dispara solo al montar
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const data = await ocupacionesApi.getActivas()
      setOcupaciones(data)
    } catch {
      if (!silencioso) {
        toastRef.current({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las ocupaciones",
        })
      }
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, []) // ← sin dependencias externas inestables

  useEffect(() => { cargar() }, [cargar])

  const liberar = async (oc: Ocupacion) => {
    setLiberando(oc.id)
    try {
      await ocupacionesApi.liberar(oc.id)
      toastRef.current({ title: "✅ Zonas liberadas", description: `"${oc.titulo}" finalizada` })
      await cargar(true)
      onSuccess?.()
    } catch (err) {
      toastRef.current({
        variant: "destructive",
        title: "Error al liberar",
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setLiberando(null)
    }
  }

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id))

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
          <MapPin className="w-3.5 h-3.5" />
          Zonas ocupadas
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => cargar()}
          disabled={loading}
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : ocupaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Inbox className="w-8 h-8 opacity-30" />
          <p className="text-sm font-medium">Sin zonas ocupadas</p>
          <p className="text-xs opacity-60">Todos los espacios están disponibles</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ocupaciones.map((oc) => {
            const expanded = expandedId === oc.id
            const hoy      = esHoy(oc.fechaDesde)

            return (
              <div
                key={oc.id}
                className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden"
              >
                {/* Fila principal */}
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(oc.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{oc.titulo}</span>
                      {hoy && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Hoy
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatFecha(oc.fechaDesde)}
                        {oc.fechaDesde !== oc.fechaHasta && ` → ${formatFecha(oc.fechaHasta)}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {oc.horaDesde} – {oc.horaHasta}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {oc.cantidadPersonas}
                      </span>
                    </div>
                  </div>
                  {expanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  }
                </button>

                {/* Detalle expandido */}
                {expanded && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t bg-muted/10">
                    {/* Áreas */}
                    <div className="space-y-1 pt-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Zonas:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {oc.areas?.length > 0
                          ? oc.areas.map((r) => (
                              <Badge key={r.areaId} variant="secondary" className="text-xs">
                                {r.area?.nombre ?? `Área ${r.areaId}`}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">Sin zonas</span>
                        }
                      </div>
                    </div>

                    {/* Requerimiento */}
                    {oc.requerimiento && (
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        {oc.requerimiento}
                      </p>
                    )}

                    {/* Anexos */}
                    {oc.anexos?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Anexos:
                        </p>
                        {oc.anexos.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline truncate block"
                          >
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
      )}
    </div>
  )
}
