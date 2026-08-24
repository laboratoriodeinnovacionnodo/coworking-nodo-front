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
import { CalendarioCoworking } from "@/components/calendario-coworking"
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
  CalendarRange,
  MapPin,
  Map,
  LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

// ── Vistas disponibles dentro del card principal ──────────────
type Vista = "disponibilidad" | "asientos" | "mapa" | "agendar" | "calendario"

const VISTAS: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: "disponibilidad", label: "Disponibilidad", icon: MapPin       },
  { id: "asientos",       label: "Asientos",       icon: LayoutGrid   },
  { id: "mapa",           label: "Mapa",           icon: Map          },
  { id: "agendar",        label: "Agendar",        icon: CalendarPlus },
  { id: "calendario",     label: "Calendario",     icon: CalendarRange },
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
    if (v === "mapa")    { setMapaOpen(true);   return }
    if (v === "agendar") { setAgendarOpen(true); return }
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
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Armchair className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Gestión de Espacios</h1>
                <p className="text-xs text-muted-foreground">{admin.nombre} · {admin.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
                <LogOut className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1">
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
                    <div className="flex items-center gap-2 py-1">
                      <Switch
                        id="admin-mode-mobile"
                        checked={isAdminMode}
                        onCheckedChange={setIsAdminMode}
                      />
                      <Label htmlFor="admin-mode-mobile" className="cursor-pointer">Modo Admin</Label>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
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

      {/* ══ Contenido ══════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-foreground">{seats.length}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 p-3 md:p-4 text-center shadow-sm">
            <p className="text-xl md:text-2xl font-bold text-green-500">{availableCount}</p>
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
                const isModal  = id === "mapa" || id === "agendar"
                const isActive = !isModal && vista === id

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

            {/* Calendario Coworking */}
            {vista === "calendario" && (
              <CalendarioCoworking />
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
