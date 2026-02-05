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
import { Loader2, RefreshCw, LogOut, Menu, Armchair, Users, CheckCircle, Building2 } from "lucide-react"
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
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center px-4">
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
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Armchair className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-foreground">Gestión de Asientos</h1>
                  <p className="text-xs text-muted-foreground">NODO Tecnológico</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right text-sm">
                  <p className="font-medium text-foreground">{admin.nombre}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-2 rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={logout} className="gap-2 rounded-lg text-destructive">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                    <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                    <Label htmlFor="admin-mode" className="text-xs font-medium cursor-pointer">Admin</Label>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Armchair className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold truncate text-foreground">Gestión de Asientos</h1>
                  <p className="text-xs text-muted-foreground truncate">{admin.nombre}</p>
                </div>
              </div>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-lg">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="space-y-4 mt-8">
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{admin.nombre}</p>
                      <p className="text-xs text-muted-foreground text-foreground">{admin.email}</p>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-border">
                      <Button onClick={handleRefresh} className="w-full justify-start gap-2" variant="ghost" size="sm">
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                      </Button>
                      {isAdmin && (
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary">
                          <Label htmlFor="admin-mode-mobile" className="text-sm font-medium cursor-pointer">Modo Admin</Label>
                          <Switch 
                            id="admin-mode-mobile" 
                            checked={isAdminMode} 
                            onCheckedChange={setIsAdminMode} 
                          />
                        </div>
                      )}
                      <Button onClick={logout} className="w-full justify-start gap-2" variant="ghost" size="sm" className="text-destructive">
                        <LogOut className="w-4 h-4" />
                        Salir
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Error Banner */}
          {error && (
            <>
              <Alert variant="destructive" className="text-sm rounded-xl shadow-sm">
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
                          className="mt-2 bg-white"
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Armchair className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Total de asientos</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{seats.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Ocupados</p>
                  <p className="text-2xl md:text-3xl font-bold text-red-500">{occupiedCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Disponibles</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-500">{availableCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Blocked Alert */}
          {isBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
              <p className="text-red-700 font-semibold">Sistema bloqueado por evento: {eventName}</p>
            </div>
          )}

          {/* Admin Panel */}
          {isAdminMode && isAdmin && (
            <div>
              <AdminPanel isBlocked={isBlocked} eventName={eventName} onToggleBlock={handleToggleBlock} />
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-primary/5 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estados de los Asientos</h2>
            <SeatLegend />
          </div>

          {/* Seat Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-primary/5 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Mapa de Asientos</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {isAdminMode ? "Modo edición activo" : "Haz clic para gestionar"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <SeatGrid seats={seats} onSeatClick={handleSeatClick} isBlocked={isBlocked && !isAdminMode} />
            </div>
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
  )
}
