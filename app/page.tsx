"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Seat } from "@/types/seat"
import { useSeats } from "@/hooks/use-seats"
import { SeatGrid } from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import { AdminPanel } from "@/components/admin-panel"
import { AgendarModal } from "@/components/agendar-modal"
import { DisponibilidadTabla } from "@/components/disponibilidad-tabla"
import { MapaModal } from "@/components/mapa-modal"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  RefreshCw,
  LogOut,
  Menu,
  Armchair,
  CalendarPlus,
  MapPin,
  Map,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

export default function CoworkingSeatsPage() {
  const router = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll } = useSeats()
  const { toast } = useToast()

  const [isAdminMode,      setIsAdminMode]      = useState(false)
  const [isBlocked,        setIsBlocked]        = useState(false)
  const [eventName,        setEventName]        = useState<string>()
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false)

  // Modales
  const [agendarOpen,      setAgendarOpen]      = useState(false)
  const [disponibilidadOpen, setDisponibilidadOpen] = useState(false)
  const [mapaOpen,         setMapaOpen]         = useState(false)

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

  const occupiedCount  = seats.filter((s) => s.status === "occupied").length
  const availableCount = seats.filter((s) => s.status === "available").length

  // ── Loading states ──────────────────────────────────────────
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
          <p className="text-muted-foreground text-sm">Cargando áreas del backend...</p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 md:px-6 py-4 max-w-7xl mx-auto">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <Armchair className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestión de Espacios</h1>
                <p className="text-xs text-muted-foreground">NODO Tecnológico</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right text-sm mr-1">
                <p className="font-medium">{admin.nombre}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>

              {/* Botón Disponibilidad */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setDisponibilidadOpen(true)}
              >
                <MapPin className="w-4 h-4" />
                Disponibilidad
              </Button>

              {/* Botón Mapa */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setMapaOpen(true)}
              >
                <Map className="w-4 h-4" />
                Mapa
              </Button>

              {/* Botón Agendar */}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setAgendarOpen(true)}
              >
                <CalendarPlus className="w-4 h-4" />
                Agendar
              </Button>

              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>

              {isAdmin && (
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
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
                <h1 className="text-base font-bold">Gestión de Espacios</h1>
                <p className="text-[10px] text-muted-foreground">NODO Tecnológico</p>
              </div>
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="space-y-4 pt-4">
                  <div className="pb-3 border-b">
                    <p className="font-medium">{admin.nombre}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>

                  <Button
                    className="w-full gap-2 justify-start"
                    onClick={() => { setAgendarOpen(true); setMobileMenuOpen(false) }}
                  >
                    <CalendarPlus className="w-4 h-4" /> Agendar ocupación
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                    onClick={() => { setDisponibilidadOpen(true); setMobileMenuOpen(false) }}
                  >
                    <MapPin className="w-4 h-4" /> Disponibilidad
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                    onClick={() => { setMapaOpen(true); setMobileMenuOpen(false) }}
                  >
                    <Map className="w-4 h-4" /> Ver mapa
                  </Button>

                  <Button variant="outline" className="w-full gap-2 justify-start" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4" /> Actualizar
                  </Button>

                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Switch id="admin-mode-mobile" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                      <Label htmlFor="admin-mode-mobile" className="text-sm cursor-pointer">Modo admin</Label>
                    </div>
                  )}

                  <Button variant="ghost" className="w-full gap-2 justify-start text-destructive" onClick={logout}>
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>

      {/* ── Contenido principal ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6">

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{availableCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Libres</p>
          </div>
          <div className="bg-card border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{occupiedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ocupados</p>
          </div>
        </div>

        {/* Leyenda */}
        <SeatLegend />

        {/* Admin panel */}
        {isAdminMode && isAdmin && (
          <AdminPanel
            isBlocked={isBlocked}
            eventName={eventName}
            onToggleBlock={handleToggleBlock}
          />
        )}

        {/* Grid de asientos (display only — sin modal de zona) */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SeatGrid seats={seats} isBlocked={isBlocked} />
        </div>

      </div>

      {/* ── Modales ─────────────────────────────────────────── */}
      <AgendarModal
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
        onSuccess={fetchSeats}
      />

      <DisponibilidadTabla
        open={disponibilidadOpen}
        onOpenChange={setDisponibilidadOpen}
        onSuccess={fetchSeats}
      />

      <MapaModal
        open={mapaOpen}
        onOpenChange={setMapaOpen}
      />

    </div>
  )
}
