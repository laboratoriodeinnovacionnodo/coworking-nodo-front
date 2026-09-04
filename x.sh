#!/usr/bin/env bash
# ============================================================================
#  v19-fix-layout-disponibilidad.sh  — coworking-front
#
#  Fixes:
#    · Calendario al lado de Zonas ocupadas (grid 2col real, sin div extra)
#    · Contenedor max-w-4xl → max-w-6xl (más ancho)
#    · Paginado en DisponibilidadInline (5 por página)
#
#  Sin cambios de lógica ni de backend.
#
#  Uso:
#    cd coworking-front
#    chmod +x v19-fix-layout-disponibilidad.sh
#    ./v19-fix-layout-disponibilidad.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🎨  v19 — Fix layout side-by-side + paginado                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# 1. components/disponibilidad-inline.tsx — agrega paginado
# ════════════════════════════════════════════════════════════════════════════
echo "📄  components/disponibilidad-inline.tsx..."
cat > components/disponibilidad-inline.tsx << 'EOF'
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ocupacionesApi } from "@/lib/ocupacion-api"
import type { Ocupacion } from "@/types/ocupacion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import {
  Loader2, MapPin, Clock, Users, Unlock,
  RefreshCw, Inbox, Link2, ChevronDown, ChevronUp,
  CalendarDays, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DisponibilidadInlineProps {
  onSuccess?: () => void
}

const POR_PAGINA = 5

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  })
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function estadoOcupacion(oc: Ocupacion): "vencida" | "en-curso" | "proxima" {
  const ar      = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const minNow  = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  const fechaHoy = ar.toISOString().split("T")[0]

  const ocDesde = oc.fechaDesde.split("T")[0]
  const ocHasta = oc.fechaHasta.split("T")[0]

  if (ocHasta < fechaHoy) return "vencida"
  if (ocDesde > fechaHoy) return "proxima"
  if (ocDesde < fechaHoy && ocHasta > fechaHoy) return "en-curso"

  if (ocDesde === fechaHoy && ocHasta === fechaHoy) {
    const ini = timeToMinutes(oc.horaDesde)
    const fin = timeToMinutes(oc.horaHasta)
    if (minNow >= fin)  return "vencida"
    if (minNow >= ini)  return "en-curso"
    return "proxima"
  }
  if (ocDesde === fechaHoy) return minNow >= timeToMinutes(oc.horaDesde) ? "en-curso" : "proxima"
  return minNow < timeToMinutes(oc.horaHasta) ? "en-curso" : "vencida"
}

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  "en-curso": { label: "En curso", className: "bg-blue-100 text-blue-700 border-blue-200" },
  "proxima":  { label: "Próxima",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "vencida":  { label: "Vencida",  className: "bg-red-100 text-red-700 border-red-200" },
}

export function DisponibilidadInline({ onSuccess }: DisponibilidadInlineProps) {
  const { toast } = useToast()
  const toastRef  = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([])
  const [loading,     setLoading]     = useState(false)
  const [liberando,   setLiberando]   = useState<number | null>(null)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)
  const [pagina,      setPagina]      = useState(1)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const todas = await ocupacionesApi.getAll()
      const pendientes = todas.filter((o) => !o.liberadaAt)
      pendientes.sort((a, b) => {
        const orden = { "en-curso": 0, "proxima": 1, "vencida": 2 }
        const ea = estadoOcupacion(a)
        const eb = estadoOcupacion(b)
        if (ea !== eb) return orden[ea] - orden[eb]
        return a.fechaDesde.localeCompare(b.fechaDesde)
      })
      setOcupaciones(pendientes)
      setPagina(1) // resetear paginado al recargar
    } catch {
      if (!silencioso) {
        toastRef.current({ variant: "destructive", title: "Error", description: "No se pudieron cargar las ocupaciones" })
      }
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [])

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

  // ── Paginado ──────────────────────────────────────────────────────────────
  const totalPaginas   = Math.max(1, Math.ceil(ocupaciones.length / POR_PAGINA))
  const paginaActual   = Math.min(pagina, totalPaginas)
  const inicio         = (paginaActual - 1) * POR_PAGINA
  const ocupacionesPag = ocupaciones.slice(inicio, inicio + POR_PAGINA)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
          <MapPin className="w-3.5 h-3.5" />
          Zonas ocupadas
          {ocupaciones.length > 0 && (
            <span className="ml-1 text-xs font-normal normal-case">
              ({ocupaciones.length})
            </span>
          )}
        </h3>
        <Button
          variant="ghost" size="sm"
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
        <>
          <div className="space-y-2">
            {ocupacionesPag.map((oc) => {
              const estado   = estadoOcupacion(oc)
              const badge    = ESTADO_BADGE[estado]
              const expanded = expandedId === oc.id

              return (
                <div
                  key={oc.id}
                  className={cn(
                    "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden",
                    estado === "vencida" && "opacity-70",
                  )}
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
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", badge.className)}>
                          {badge.label}
                        </Badge>
                        {estado === "vencida" && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatFecha(oc.fechaDesde)}
                          {oc.fechaDesde.split("T")[0] !== oc.fechaHasta.split("T")[0] &&
                            ` → ${formatFecha(oc.fechaHasta)}`}
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
                      ? <ChevronUp   className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    }
                  </button>

                  {/* Detalle expandido */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3 border-t bg-muted/10">
                      {estado === "vencida" && (
                        <div className="flex items-center gap-2 pt-3 text-xs text-red-600">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          El horario ya pasó. Liberá las zonas para que queden disponibles.
                        </div>
                      )}
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
                      {oc.requerimiento && (
                        <p className="text-xs text-muted-foreground border-t pt-2">{oc.requerimiento}</p>
                      )}
                      {oc.anexos?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Anexos:
                          </p>
                          {oc.anexos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline truncate block">{url}</a>
                          ))}
                        </div>
                      )}
                      <div className="pt-1">
                        <Button
                          size="sm" variant="outline"
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

          {/* Paginado — solo si hay más de una página */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, ocupaciones.length)} de {ocupaciones.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant={n === paginaActual ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => setPagina(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
EOF
echo "✅  components/disponibilidad-inline.tsx"

# ════════════════════════════════════════════════════════════════════════════
# 2. app/page.tsx — layout correcto + max-w-6xl
# ════════════════════════════════════════════════════════════════════════════
echo "📄  app/page.tsx — layout side-by-side corregido..."

# Reemplazar max-w-4xl por max-w-6xl (contenedor + header)
sed -i 's/max-w-4xl/max-w-6xl/g' app/page.tsx

# Reemplazar el bloque de disponibilidad con el grid correcto (2 cols sin div separador)
node - << 'JSEOF'
const fs  = require("fs")
let   src = fs.readFileSync("app/page.tsx", "utf8")

const OLD = `            {/* ✅ Disponibilidad + Calendario lado a lado */}
            {vista === "disponibilidad" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda: zonas ocupadas */}
                <div className="min-w-0">
                  <DisponibilidadInline onSuccess={fetchSeats} />
                </div>

                {/* Separador vertical solo en desktop */}
                <div className="hidden lg:block w-px bg-border self-stretch" />

                {/* Columna derecha: calendario de eventos */}
                <div className="min-w-0">
                  {/* Label para diferenciar la sección en mobile */}
                  <div className="lg:hidden mb-3 pt-3 border-t border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <span>📅</span> Calendario
                    </h3>
                  </div>
                  <CalendarioCoworking />
                </div>
              </div>
            )}`

const NEW = `            {/* Disponibilidad + Calendario lado a lado */}
            {vista === "disponibilidad" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 items-start">
                {/* Columna izquierda: zonas ocupadas */}
                <div className="min-w-0">
                  <DisponibilidadInline onSuccess={fetchSeats} />
                </div>
                {/* Columna derecha: calendario de eventos */}
                <div className="min-w-0 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
                  <CalendarioCoworking />
                </div>
              </div>
            )}`

if (src.includes(OLD)) {
  src = src.replace(OLD, NEW)
  fs.writeFileSync("app/page.tsx", src, "utf8")
  console.log("✅  Bloque disponibilidad reemplazado")
} else {
  // Fallback: buscar el bloque por patrón más simple
  const re = /\{\/\* ✅ Disponibilidad \+ Calendario[\s\S]*?vista === "disponibilidad" &&[\s\S]*?\}\s*\}\s*\}\)/
  if (re.test(src)) {
    src = src.replace(re, `{/* Disponibilidad + Calendario lado a lado */}
            {vista === "disponibilidad" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 items-start">
                <div className="min-w-0">
                  <DisponibilidadInline onSuccess={fetchSeats} />
                </div>
                <div className="min-w-0 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
                  <CalendarioCoworking />
                </div>
              </div>
            )}`)
    fs.writeFileSync("app/page.tsx", src, "utf8")
    console.log("✅  Bloque disponibilidad reemplazado (fallback)")
  } else {
    console.log("⚠️  No se encontró el bloque exacto — editá manualmente el grid en app/page.tsx")
  }
}
JSEOF

# ════════════════════════════════════════════════════════════════════════════
# Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v19-fix-layout-disponibilidad.sh completado                ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Cambios:"
echo "    · disponibilidad-inline.tsx → paginado de 5 por página"
echo "    · app/page.tsx → grid 2 cols sin div separador extra"
echo "    · app/page.tsx → max-w-4xl → max-w-6xl"
echo "    · Divisor: border-l en desktop, border-t en mobile"
echo ""