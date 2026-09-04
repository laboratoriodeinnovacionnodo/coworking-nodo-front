"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter }           from "next/navigation"
import { useAuth }             from "@/contexts/auth-context"
import { useSeats }            from "@/hooks/use-seats"
import { useEventoActivo }     from "@/hooks/use-evento-activo"
import { SeatGrid }            from "@/components/seat-grid"
import { SeatLegend }          from "@/components/seat-legend"
import { AdminPanel }          from "@/components/admin-panel"
import { AgendarModal }        from "@/components/agendar-modal"
import { MapaModal }           from "@/components/mapa-modal"
import { DisponibilidadInline} from "@/components/disponibilidad-inline"
import { CalendarioCoworking } from "@/components/calendario-coworking"
import { EventoActivoBanner }  from "@/components/evento-activo-banner"
import { Button }              from "@/components/ui/button"
import { Switch }              from "@/components/ui/switch"
import { Label }               from "@/components/ui/label"
import { cn }                  from "@/lib/utils"
import { useToast }            from "@/hooks/use-toast"
import {
  Loader2, RefreshCw, LogOut, Menu,
  Armchair, CalendarPlus, CalendarRange, MapPin, Map, LayoutGrid,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// ── Vistas ───────────────────────────────────────────────────────────────────
type Vista = "disponibilidad" | "asientos" | "mapa" | "agendar" | "calendario"

const VISTAS: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: "disponibilidad", label: "Disponibilidad", icon: MapPin        },
  { id: "asientos",       label: "Asientos",       icon: LayoutGrid    },
  { id: "mapa",           label: "Mapa",           icon: Map           },
  { id: "agendar",        label: "Agendar",        icon: CalendarPlus  },
  { id: "calendario",     label: "Calendario",     icon: CalendarRange },
]

export default function CoworkingSeatsPage() {
  const router                = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, fetchSeats, toggleBlockAll }   = useSeats()
  const { eventoActivo }      = useEventoActivo()
  const { toast }             = useToast()

  const [isAdminMode,    setIsAdminMode]    = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [vista,          setVista]          = useState<Vista>("asientos")
  const [mapaOpen,       setMapaOpen]       = useState(false)
  const [agendarOpen,    setAgendarOpen]    = useState(false)

  // Ref para rastrear el estado de bloqueo previo por evento
  // y disparar bloqueo/liberación solo cuando cambia
  const bloqueadoPorEventoRef = useRef<string | null>(null)

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !admin) router.push("/login")
  }, [admin, authLoading, router])

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSeats()
  }, [fetchSeats])

  // ── Auto-bloqueo / auto-liberación por evento del calendario ──────────────
  useEffect(() => {
    const eventoId = eventoActivo?.id ?? null

    // No hacer nada si no cambió el estado del evento
    if (eventoId === bloqueadoPorEventoRef.current) return

    if (eventoId !== null && bloqueadoPorEventoRef.current === null) {
      // Nuevo evento detectado → bloquear
      bloqueadoPorEventoRef.current = eventoId
      toggleBlockAll(true).catch(() => {})
    } else if (eventoId === null && bloqueadoPorEventoRef.current !== null) {
      // Evento terminó → liberar
      bloqueadoPorEventoRef.current = null
      toggleBlockAll(false).catch(() => {})
    } else if (eventoId !== null && bloqueadoPorEventoRef.current !== null && eventoId !== bloqueadoPorEventoRef.current) {
      // Cambió de evento (caso raro, pero posible) → solo actualizar ref
      bloqueadoPorEventoRef.current = eventoId
    }
  }, [eventoActivo, toggleBlockAll])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleBlock = async (block: boolean) => {
    await toggleBlockAll(block)
  }

  const handleRefresh = async () => {
    await fetchSeats()
    toast({ title: "Datos actualizados", description: "Se recargaron los datos desde el backend" })
  }

  const handleVista = (v: Vista) => {
    if (v === "mapa")    { setMapaOpen(true);   return }
    if (v === "agendar") { setAgendarOpen(true); return }
    setVista(v)
  }

  // isBlocked: hay evento activo O todas las áreas están OCUPADO
  const bloqueadoPorEvento = eventoActivo !== null
  const bloqueadoManual    = !bloqueadoPorEvento && seats.length > 0 && seats.every((s) => s.status === "occupied")
  const isBlocked          = bloqueadoPorEvento || bloqueadoManual

  const occupiedCount  = seats.filter((s) => s.status === "occupied").length
  const availableCount = seats.filter((s) => s.status === "available").length

  // ── Renders de carga / guard ──────────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">

      {/* ══ Header ══════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Armchair className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Coworking</h1>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                  <Label htmlFor="admin-mode" className="text-sm cursor-pointer">Admin</Label>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Armchair className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-sm">Coworking</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="w-4 h-4" />
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
      </div>

      {/* ══ Contenido ════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Banner de evento activo — siempre visible si hay evento */}
        {eventoActivo && (
          <EventoActivoBanner evento={eventoActivo} />
        )}

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

        {/* Admin panel — solo si es admin Y no hay evento automático */}
        {isAdminMode && isAdmin && !bloqueadoPorEvento && (
          <AdminPanel
            isBlocked={bloqueadoManual}
            onToggleBlock={handleToggleBlock}
          />
        )}

        {/* Admin panel deshabilitado cuando hay evento — informativo */}
        {isAdminMode && isAdmin && bloqueadoPorEvento && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
            El panel de administración está deshabilitado mientras haya un evento activo en el calendario.
            Las áreas se liberarán automáticamente cuando el evento termine.
          </div>
        )}

        {/* ══ Card principal con tabs ═══════════════════════════════ */}
        <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">

          {/* Barra de vistas */}
          <div className="border-b border-border px-4 pt-4 pb-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {VISTAS.map(({ id, label, icon: Icon }) => {
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
                      id === "agendar" && !isActive ? "hover:text-primary" : "",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenido activo */}
          <div className="p-4 md:p-6">

            {vista === "disponibilidad" && (
              <DisponibilidadInline onSuccess={fetchSeats} />
            )}

            {vista === "asientos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SeatLegend />
                  {isBlocked && (
                    <span className="text-xs text-destructive font-medium">
                      {bloqueadoPorEvento ? `Evento: ${eventoActivo?.titulo}` : "Bloqueado"}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <SeatGrid
                    seats={seats}
                    isBlocked={isBlocked && !isAdminMode}
                  />
                </div>
              </div>
            )}

            {vista === "calendario" && (
              <CalendarioCoworking />
            )}

          </div>
        </div>

      </div>

      {/* ══ Modales ══════════════════════════════════════════════════ */}
      <MapaModal    open={mapaOpen}    onOpenChange={setMapaOpen} />
      <AgendarModal open={agendarOpen} onOpenChange={setAgendarOpen} onSuccess={fetchSeats} />

    </div>
  )
}
