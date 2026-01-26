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
import { Building2, Loader2, RefreshCw, LogOut } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  if (loading && seats.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando asientos del backend...</p>
          <p className="text-xs text-muted-foreground">
            Conectando a: {process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-balance">Sistema de Asientos Coworking</h1>
                <p className="text-muted-foreground">Gestión en tiempo real de espacios</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{admin.nombre}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Switch id="admin-mode" checked={isAdminMode} onCheckedChange={setIsAdminMode} />
                  <Label htmlFor="admin-mode">Modo Admin</Label>
                </div>
              )}
            </div>
          </div>

          {error && (
            <>
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{error}</p>
                    {error.includes("Failed to fetch") && (
                      <div className="text-sm space-y-1">
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Total de asientos</div>
              <div className="text-2xl font-bold">{seats.length}</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Asientos ocupados</div>
              <div className="text-2xl font-bold text-[var(--seat-occupied)]">{occupiedCount}</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Asientos disponibles</div>
              <div className="text-2xl font-bold text-[var(--seat-available)]">{availableCount}</div>
            </div>
          </div>

          {isBlocked && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
              <p className="text-destructive font-medium">⚠️ Área bloqueada por evento: {eventName}</p>
            </div>
          )}
        </div>

        {/* Admin Panel */}
        {isAdminMode && isAdmin && (
          <div className="mb-8">
            <AdminPanel isBlocked={isBlocked} eventName={eventName} onToggleBlock={handleToggleBlock} />
          </div>
        )}

        {/* Legend */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Leyenda</h2>
          <SeatLegend />
        </div>

        {/* Seat Grid */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Mapa de Asientos</h2>
            <div className="text-sm text-muted-foreground">
              {isAdminMode ? "Click para editar estado" : "Click para ocupar/liberar"}
            </div>
          </div>

          <SeatGrid seats={seats} onSeatClick={handleSeatClick} isBlocked={isBlocked && !isAdminMode} />
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
