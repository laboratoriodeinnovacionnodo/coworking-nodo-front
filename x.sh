#!/usr/bin/env bash
# =============================================================================
# front-layout-v2.sh  —  v1.0.0  —  PRODUCCIÓN
#
# Cambios vs versión anterior:
#  · Header limpio: solo logo + datos admin + refresh + logout + switch admin
#  · Dentro del card del mapa: 4 botones contextuales (Disponibilidad / Asientos / Mapa / Agendar)
#  · "Disponibilidad" es un switch: activa una tabla inline dentro del mismo card
#  · "Asientos" muestra el SeatGrid (default)
#  · "Mapa" abre MapaModal (sin cambios)
#  · "Agendar" abre AgendarModal (sin cambios)
# =============================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  front-layout-v2.sh — v1.0.0                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ════════════════════════════════════════════════════════════════
# 1. components/disponibilidad-inline.tsx
#    Tabla inline — no modal — usada dentro del card principal
# ════════════════════════════════════════════════════════════════
cat > components/disponibilidad-inline.tsx << 'EOF'
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
EOF
echo "✅  components/disponibilidad-inline.tsx"

# ════════════════════════════════════════════════════════════════
# 2. app/page.tsx — reescritura completa
# ════════════════════════════════════════════════════════════════
cat > app/page.tsx << 'EOF'
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useSeats } from "@/hooks/use-seats"
import { SeatGrid } from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import { AdminPanel } from "@/components/admin-panel"
import { AgendarModal } from "@/components/agendar-modal"
import { MapaModal } from "@/components/mapa-modal"
import { DisponibilidadInline } from "@/components/disponibilidad-inline"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Loader2,
  RefreshCw,
  LogOut,
  Menu,
  Armchair,
  CalendarPlus,
  MapPin,
  Map,
  LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

// ── Vistas disponibles dentro del card principal ──────────────
type Vista = "disponibilidad" | "asientos" | "mapa" | "agendar"

const VISTAS: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: "disponibilidad", label: "Disponibilidad", icon: MapPin      },
  { id: "asientos",       label: "Asientos",       icon: LayoutGrid  },
  { id: "mapa",           label: "Mapa",           icon: Map         },
  { id: "agendar",        label: "Agendar",        icon: CalendarPlus },
]

export default function CoworkingSeatsPage() {
  const router = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll } = useSeats()
  const { toast } = useToast()

  const [isAdminMode,    setIsAdminMode]    = useState(false)
  const [isBlocked,      setIsBlocked]      = useState(false)
  const [eventName,      setEventName]      = useState<string>()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Vista activa dentro del card
  const [vista,          setVista]          = useState<Vista>("asientos")

  // Modales (Mapa y Agendar abren modal)
  const [mapaOpen,       setMapaOpen]       = useState(false)
  const [agendarOpen,    setAgendarOpen]    = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  const handleToggleBlock = async (block: boolean, newEventName?: string) => {
    setIsBlocked(block)
    setEventName(newEventName)
    await toggleBlockAll(block)
  }

  const handleRefresh = async () => {
    await fetchSeats()
    toast({ title: "Datos actualizados", description: "Se recargaron los datos desde el backend" })
  }

  // Al hacer clic en un botón de vista
  const handleVista = (v: Vista) => {
    if (v === "mapa")    { setMapaOpen(true);    return }
    if (v === "agendar") { setAgendarOpen(true);  return }
    setVista(v)
  }

  const occupiedCount  = seats.filter((s) => s.status === "occupied").length
  const availableCount = seats.filter((s) => s.status === "available").length

  // ── Loading ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!admin) return null

  if (loading && seats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Cargando áreas...</p>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">

      {/* ══ Header — solo identidad + acciones globales ════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 md:px-6 py-3 max-w-7xl mx-auto">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            {/* Logo + título */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                <Armchair className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Gestión de Espacios</h1>
                <p className="text-[11px] text-muted-foreground leading-none">NODO Tecnológico</p>
              </div>
            </div>

            {/* Acciones globales */}
            <div className="flex items-center gap-2">
              <div className="text-right text-sm mr-1">
                <p className="font-medium leading-tight">{admin.nombre}</p>
                <p className="text-xs text-muted-foreground leading-none">{admin.email}</p>
              </div>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} title="Actualizar">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={logout}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>

              {isAdmin && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                  <Switch
                    id="admin-mode"
                    checked={isAdminMode}
                    onCheckedChange={setIsAdminMode}
                    className="scale-90"
                  />
                  <Label htmlFor="admin-mode" className="text-xs cursor-pointer">Admin</Label>
                </div>
              )}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <Armchair className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Gestión de Espacios</h1>
                <p className="text-[10px] text-muted-foreground">{admin.nombre}</p>
              </div>
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="space-y-3 pt-4">
                  <div className="pb-3 border-b">
                    <p className="font-semibold">{admin.nombre}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => { handleRefresh(); setMobileMenuOpen(false) }}
                  >
                    <RefreshCw className="w-4 h-4" /> Actualizar
                  </Button>
                  {isAdmin && (
                    <div className="flex items-center justify-between py-2 border-t">
                      <Label className="text-sm cursor-pointer">Modo admin</Label>
                      <Switch checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>

      {/* ══ Contenido principal ════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-primary/10 p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-foreground">{seats.length}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-green-600">{availableCount}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Libres</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-red-500">{occupiedCount}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Ocupados</p>
          </div>
        </div>

        {/* Admin panel */}
        {isAdminMode && isAdmin && (
          <AdminPanel
            isBlocked={isBlocked}
            eventName={eventName}
            onToggleBlock={handleToggleBlock}
          />
        )}

        {/* ══ Card principal con tabs ═══════════════════════ */}
        <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">

          {/* ── Barra de navegación de vistas ──────────────── */}
          <div className="border-b border-border px-4 pt-4 pb-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {VISTAS.map(({ id, label, icon: Icon }) => {
                // Mapa y Agendar no tienen estado "activo" (abren modal)
                const isModal   = id === "mapa" || id === "agendar"
                const isActive  = !isModal && vista === id

                return (
                  <button
                    key={id}
                    onClick={() => handleVista(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      // Agendar tiene color especial
                      id === "agendar" && !isActive
                        ? "hover:text-primary"
                        : "",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Contenido de la vista activa ───────────────── */}
          <div className="p-4 md:p-6">

            {/* Disponibilidad */}
            {vista === "disponibilidad" && (
              <DisponibilidadInline onSuccess={fetchSeats} />
            )}

            {/* Asientos */}
            {vista === "asientos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SeatLegend />
                  {isBlocked && (
                    <span className="text-xs text-destructive font-medium">
                      Bloqueado · {eventName}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <SeatGrid seats={seats} isBlocked={isBlocked && !isAdminMode} />
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Modales ════════════════════════════════════════════ */}
      <MapaModal
        open={mapaOpen}
        onOpenChange={setMapaOpen}
      />
      <AgendarModal
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
        onSuccess={fetchSeats}
      />

    </div>
  )
}
EOF
echo "✅  app/page.tsx — reescrito con tabs contextuales"

# ════════════════════════════════════════════════════════════════
# 3. Verificar shadcn table (puede no estar instalado)
# ════════════════════════════════════════════════════════════════
if [ ! -f "components/ui/table.tsx" ]; then
  echo "📦  Instalando shadcn table..."
  pnpm dlx shadcn@latest add table --yes
fi

# ════════════════════════════════════════════════════════════════
# 4. Build
# ════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  front-layout-v2.sh completado                              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Estructura de la pantalla:"
echo ""
echo "  ┌─ Header ────────────────────────────────────────────────┐"
echo "  │  [Logo + Título]          [Refresh] [Logout] [Admin sw] │"
echo "  └──────────────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Stats ──────────────────────────────────────────────────┐"
echo "  │   Total · Libres · Ocupados                              │"
echo "  └──────────────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Card principal ─────────────────────────────────────────┐"
echo "  │  [Disponibilidad] [Asientos] [Mapa↗] [Agendar↗]         │"
echo "  │  ─────────────────────────────────────────────────────── │"
echo "  │  Disponibilidad → tabla inline + botones Liberar         │"
echo "  │  Asientos       → SeatGrid (vista por defecto)           │"
echo "  │  Mapa    ↗      → abre MapaModal                         │"
echo "  │  Agendar ↗      → abre AgendarModal                      │"
echo "  └──────────────────────────────────────────────────────────┘"
echo ""