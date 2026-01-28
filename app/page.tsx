"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Seat, SeatStatus } from "@/types/seat"
import { useSeats } from "@/hooks/use-seats"
import { SeatGrid } from "@/components/seat-grid"
import { SeatStatusModal } from "@/components/seat-status-modal"
import { SeatLegend } from "@/components/seat-legend"
import { AdminPanel } from "@/components/admin-panel"
import { CorsInfoBanner } from "@/components/cors-info-banner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Building2, Loader2, RefreshCw, LogOut, Menu } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function CoworkingSeatsPage() {
  const router = useRouter()
  const { admin, isAdmin, logout, loading: authLoading } = useAuth()
  const { seats, loading, error, updateSeatStatus, toggleBlockAll, fetchSeats } = useSeats()
  const { toast } = useToast()

  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [eventName, setEventName] = useState<string>()
  const [showCorsInfo, setShowCorsInfo] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) {
      router.push("/login")
    }
  }, [admin, authLoading, router])

  const selectedSeat = selectedSeatId ? seats.find((s) => s.id === selectedSeatId) || null : null

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeatId(seat.id)
    setModalOpen(true)
  }

  const handleUpdateStatus = async (
    seatId: string,
    newStatus: SeatStatus,
    userName?: string,
    shareLimit?: number,
    peopleCount = 1,
  ) => {
    try {
      await updateSeatStatus(seatId, newStatus, userName, shareLimit, peopleCount)
      setModalOpen(false)
    } catch (err) {
      // Error ya manejado en useSeats con toast
    }
  }

  const handleToggleBlock = async (block: boolean, newEventName?: string) => {
    setIsBlocked(block)
    setEventName(newEventName)
    await toggleBlockAll(block)
  }

  const handleRefresh = async () => {
    await fetchSeats()
    toast({
      title: "Datos actualizados",
      description: "Se recargaron los asientos desde el backend",
    })
  }

  const occupiedCount = seats.filter((s) => s.status === "occupied" || s.status === "shared").length
  const availableCount = seats.filter((s) => s.status === "available" || s.status === "for-share").length

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm md:text-base">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  if (loading && seats.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm md:text-base">Cargando asientos del backend...</p>
          <p className="text-xs text-muted-foreground">
            Conectando a: {process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full md:container md:mx-auto md:px-4 md:py-8 md:max-w-7xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b md:border-0 md:mb-8">
          <div className="px-4 md:px-0 py-4 md:py-0">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold text-balance">Sistema de Asientos Coworking</h1>
                  <p className="text-muted-foreground text-sm">Gestión en tiempo real de espacios</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-medium">{admin.nombre}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={logout} className="gap-2 bg-transparent">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 bg-transparent">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                    <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                    <Label htmlFor="admin-mode" className="text-sm hidden sm:inline">Admin</Label>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold truncate">Coworking</h1>
                  <p className="text-xs text-muted-foreground truncate">{admin.nombre}</p>
                </div>
              </div>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="space-y-4 mt-8">
                    <div className="text-sm">
                      <p className="font-medium">{admin.nombre}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Button onClick={handleRefresh} className="w-full justify-start gap-2" variant="ghost">
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                      </Button>
                      {isAdmin && (
                        <div className="flex items-center justify-between p-2">
                          <Label htmlFor="admin-mode-mobile" className="text-sm">Modo Admin</Label>
                          <Switch 
                            id="admin-mode-mobile" 
                            checked={isAdminMode} 
                            onCheckedChange={setIsAdminMode} 
                          />
                        </div>
                      )}
                      <Button onClick={logout} className="w-full justify-start gap-2" variant="ghost">
                        <LogOut className="w-4 h-4" />
                        Salir
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {error && (
            <>
              <Alert variant="destructive" className="mx-4 md:mx-0 mt-4 md:mt-4 text-sm">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{error}</p>
                    {error.includes("Failed to fetch") && (
                      <div className="text-xs space-y-1">
                        <p>Este error indica un problema de CORS en el backend.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCorsInfo(!showCorsInfo)}
                          className="mt-2"
                        >
                          {showCorsInfo ? "Ocultar" : "Ver"} solución
                        </Button>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
              {showCorsInfo && <CorsInfoBanner />}
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 md:px-0 space-y-6 md:space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-card p-3 md:p-4 rounded-lg border text-sm md:text-base">
              <div className="text-xs md:text-sm text-muted-foreground mb-1">Total</div>
              <div className="text-xl md:text-2xl font-bold">{seats.length}</div>
            </div>
            <div className="bg-card p-3 md:p-4 rounded-lg border text-sm md:text-base">
              <div className="text-xs md:text-sm text-muted-foreground mb-1">Ocupados</div>
              <div className="text-xl md:text-2xl font-bold text-[var(--seat-occupied)]">{occupiedCount}</div>
            </div>
            <div className="bg-card p-3 md:p-4 rounded-lg border text-sm md:text-base">
              <div className="text-xs md:text-sm text-muted-foreground mb-1">Disponibles</div>
              <div className="text-xl md:text-2xl font-bold text-[var(--seat-available)]">{availableCount}</div>
            </div>
          </div>

          {isBlocked && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-sm md:text-base">
              <p className="text-destructive font-medium">⚠️ Área bloqueada: {eventName}</p>
            </div>
          )}

          {/* Admin Panel */}
          {isAdminMode && isAdmin && (
            <div>
              <AdminPanel isBlocked={isBlocked} eventName={eventName} onToggleBlock={handleToggleBlock} />
            </div>
          )}

          {/* Legend */}
          <div>
            <h2 className="text-base md:text-lg font-semibold mb-3">Leyenda</h2>
            <SeatLegend />
          </div>

          {/* Seat Grid */}
          <div className="bg-card p-4 md:p-6 rounded-lg border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold">Mapa de Asientos</h2>
              <div className="text-xs md:text-sm text-muted-foreground">
                {isAdminMode ? "Click para editar" : "Click para ocupar/liberar"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <SeatGrid seats={seats} onSeatClick={handleSeatClick} isBlocked={isBlocked && !isAdminMode} />
            </div>
          </div>
        </div>

        {/* Modal */}
        <SeatStatusModal
          seat={selectedSeat}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onUpdateStatus={handleUpdateStatus}
          isAdmin={isAdminMode && isAdmin}
        />
      </div>
    </div>
  )
}
