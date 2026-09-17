#!/usr/bin/env bash
# ============================================================================
#  v27-front-imagenes-zonas.sh  — coworking-front
#  Agrega imagen por zona (A, B, C, D) al modal Asientos / Mapa.
#
#  ACCIÓN MANUAL antes de hacer push:
#    Copiá 4 fotos en public/areas/:
#      public/areas/zona-a.jpg
#      public/areas/zona-b.jpg
#      public/areas/zona-c.jpg
#      public/areas/zona-d.jpg
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️   $*${RESET}"; }
fail() { echo -e "${RED}❌  $*${RESET}"; exit 1; }

[[ -f "package.json" && -d "app" ]] || fail "Corré desde la raíz de coworking-front"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  v27 · coworking-front · imágenes por zona A B C D"
echo "════════════════════════════════════════════════════════════"
echo ""

mkdir -p public/areas
ok "public/areas/"

# ── lib/area-images.ts ────────────────────────────────────────────────────
echo "📄  lib/area-images.ts"
cat > lib/area-images.ts << 'TSEOF'
/**
 * lib/area-images.ts
 * Imagen por zona (letra: A, B, C, D).
 * Fotos en public/areas/
 */
export const AREA_IMAGES: Record<string, string> = {
  A: "/areas/zona-a.jpg",
  B: "/areas/zona-b.jpg",
  C: "/areas/zona-c.jpg",
  D: "/areas/zona-d.jpg",
}

export const AREA_LABELS: Record<string, string> = {
  A: "Zona A",
  B: "Zona B",
  C: "Zona C",
  D: "Zona D",
}

export function getAreaImage(zona: string): string | null {
  return AREA_IMAGES[zona] ?? null
}

export function getAreaLabel(zona: string): string {
  return AREA_LABELS[zona] ?? `Zona ${zona}`
}
TSEOF
ok "lib/area-images.ts"

# ── lib/api.ts ────────────────────────────────────────────────────────────
echo "📄  lib/api.ts"
cat > lib/api.ts << 'TSEOF'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"

import type { BackendArea, BackendReserva, BackendUsuario, BackendAdmin } from "@/types/seat"

const statusMap: Record<string, string> = {
  available: "LIBRE",
  occupied:  "OCUPADO",
}

const reverseStatusMap: Record<string, string> = {
  LIBRE:   "available",
  OCUPADO: "occupied",
}

export const usuariosApi = {
  getAll: async (): Promise<BackendUsuario[]> => {
    const res = await fetch(`${API_BASE_URL}/usuario`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener usuarios")
    return res.json()
  },
  getById: async (id: number): Promise<BackendUsuario> => {
    const res = await fetch(`${API_BASE_URL}/usuario/${id}`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener usuario")
    return res.json()
  },
  create: async (data: { nombre: string; email: string }): Promise<BackendUsuario> => {
    const res = await fetch(`${API_BASE_URL}/usuario`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear usuario")
    return res.json()
  },
  update: async (id: number, data: Partial<{ nombre: string; email: string }>): Promise<BackendUsuario> => {
    const res = await fetch(`${API_BASE_URL}/usuario/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar usuario")
    return res.json()
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/usuario/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar usuario")
  },
}

export const areasApi = {
  getAll: async (): Promise<BackendArea[]> => {
    const res = await fetch(`${API_BASE_URL}/areas`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  getById: async (id: number): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener área")
    return res.json()
  },
  create: async (data: { nombre: string; descripcion?: string; estado?: string }): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear área")
    return res.json()
  },
  update: async (id: number, data: Partial<BackendArea>): Promise<BackendArea> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar área")
    return res.json()
  },
  cambiarEstado: async (id: number, estado: string): Promise<BackendArea> => {
    const backendEstado = statusMap[estado] || estado
    const res = await fetch(`${API_BASE_URL}/areas/${id}/estado/${backendEstado}`, { method: "PATCH" })
    if (!res.ok) throw new Error("Error al cambiar estado")
    return res.json()
  },
  bloquearTodas: async (bloquear: boolean): Promise<BackendArea[]> => {
    const estado = bloquear ? "OCUPADO" : "LIBRE"
    const areas = await areasApi.getAll()
    const results = await Promise.all(
      areas.map((area) =>
        fetch(`${API_BASE_URL}/areas/${area.id}/estado/${estado}`, { method: "PATCH" }).then((r) => {
          if (!r.ok) throw new Error(`Error al actualizar área ${area.id}`)
          return r.json()
        }),
      ),
    )
    return results
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar área")
  },
}

export const reservasApi = {
  getAll: async (): Promise<BackendReserva[]> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener reservas")
    return res.json()
  },
  getById: async (id: number): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener reserva")
    return res.json()
  },
  create: async (data: { nombre: string; detalles?: string; usuarioId: number; areaId: number }): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(`Error al crear reserva: ${e}`) }
    return res.json()
  },
  update: async (id: number, data: Partial<BackendReserva>): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al actualizar reserva")
    return res.json()
  },
  completar: async (id: number): Promise<BackendReserva> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}/completar`, { method: "PATCH" })
    if (!res.ok) throw new Error("Error al completar reserva")
    return res.json()
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Error al eliminar reserva")
  },
}

export const adminsApi = {
  login: async (email: string, password: string): Promise<BackendAdmin> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.text(); throw new Error(e || "Credenciales inválidas") }
    return res.json()
  },
  getAll: async (): Promise<BackendAdmin[]> => {
    const res = await fetch(`${API_BASE_URL}/admin`, { headers: { "Content-Type": "application/json" } })
    if (!res.ok) throw new Error("Error al obtener administradores")
    return res.json()
  },
  create: async (data: { nombre: string; email: string; password: string }): Promise<BackendAdmin> => {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Error al crear administrador")
    return res.json()
  },
}

/**
 * Convierte BackendArea → Seat.
 * zone = letra del área (A1→"A", B3→"B") para mapear la imagen por zona.
 */
export const convertBackendAreaToSeat = (area: BackendArea, reservas: BackendReserva[]) => {
  const activeReservas = reservas.filter((r) => r.areaId === area.id && r.fin === null)

  const match  = area.nombre.match(/^([A-Za-z]+)(\d+)$/)
  const letra  = match ? match[1].toUpperCase() : "A"
  const numero = match ? parseInt(match[2]) : area.id

  return {
    id:          area.nombre,
    backendId:   area.id,
    row:         letra,
    number:      numero,
    status:      (reverseStatusMap[area.estado] || "available") as "available" | "occupied",
    userName:    activeReservas[0]?.nombre,
    occupiedAt:  activeReservas[0]?.inicio ? new Date(activeReservas[0].inicio) : undefined,
    peopleCount: activeReservas.length,
    zone:        letra,
    amenities:   area.descripcion ? [area.descripcion] : [],
    mapPdfUrl:   "/coworking-map.pdf",
  }
}

export { statusMap, reverseStatusMap }
TSEOF
ok "lib/api.ts"

# ── components/asientos-mapa-modal.tsx ───────────────────────────────────
echo "📄  components/asientos-mapa-modal.tsx"
cat > components/asientos-mapa-modal.tsx << 'TSEOF'
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge }      from "@/components/ui/badge"
import { Button }     from "@/components/ui/button"
import { SeatGrid }   from "@/components/seat-grid"
import { SeatLegend } from "@/components/seat-legend"
import type { Seat }  from "@/types/seat"
import { getAreaImage, getAreaLabel } from "@/lib/area-images"
import { cn }         from "@/lib/utils"
import { Armchair, ImageIcon, ChevronLeft } from "lucide-react"

interface ZonaGroup {
  letra:     string
  seats:     Seat[]
  isBlocked: boolean
  eventName?: string
}

interface AsientosMapaModalProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  seats:         Seat[]
  isBlocked?:    boolean
  eventoTitulo?: string
}

function agruparPorZona(seats: Seat[], isBlocked: boolean, eventoTitulo?: string): ZonaGroup[] {
  const map = new Map<string, Seat[]>()
  for (const seat of seats) {
    const letra = seat.zone ?? "A"
    if (!map.has(letra)) map.set(letra, [])
    map.get(letra)!.push(seat)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, s]) => ({
      letra,
      seats:     s,
      isBlocked,
      eventName: isBlocked ? eventoTitulo : undefined,
    }))
}

export function AsientosMapaModal({
  open,
  onOpenChange,
  seats,
  isBlocked = false,
  eventoTitulo,
}: AsientosMapaModalProps) {

  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaGroup | null>(null)
  const [imgError,         setImgError]         = useState(false)

  useEffect(() => {
    if (!open) { setZonaSeleccionada(null); setImgError(false) }
  }, [open])

  const zonas  = agruparPorZona(seats, isBlocked, eventoTitulo)
  const libres   = zonaSeleccionada?.seats.filter((s) => s.status === "available").length ?? 0
  const ocupados = zonaSeleccionada?.seats.filter((s) => s.status === "occupied").length  ?? 0
  const imagen   = zonaSeleccionada ? getAreaImage(zonaSeleccionada.letra) : null
  const label    = zonaSeleccionada ? getAreaLabel(zonaSeleccionada.letra) : ""
  const descZona = zonaSeleccionada?.seats[0]?.amenities?.[0] ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Armchair className="w-5 h-5 text-primary" />
            {zonaSeleccionada ? label : "Asientos / Mapa"}
          </DialogTitle>
          <DialogDescription>
            {zonaSeleccionada
              ? `${libres} libre${libres !== 1 ? "s" : ""} · ${ocupados} ocupado${ocupados !== 1 ? "s" : ""}`
              : "Seleccioná una zona para ver su estado"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Grilla de zonas ─────────────────────────────────────────── */}
        {!zonaSeleccionada && (
          <div className="space-y-4 py-2">
            <SeatLegend />

            {isBlocked && eventoTitulo && (
              <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm">
                <span className="font-medium">Evento activo:</span> {eventoTitulo}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {zonas.map((zona) => {
                const img   = getAreaImage(zona.letra)
                const lbl   = getAreaLabel(zona.letra)
                const lib   = zona.seats.filter((s) => s.status === "available").length
                const ocu   = zona.seats.filter((s) => s.status === "occupied").length
                const total = zona.seats.length
                const pct   = total > 0 ? Math.round((ocu / total) * 100) : 0
                const desc  = zona.seats[0]?.amenities?.[0] ?? null

                return (
                  <button
                    key={zona.letra}
                    type="button"
                    onClick={() => { setImgError(false); setZonaSeleccionada(zona) }}
                    className="group text-left rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Imagen */}
                    <div className="relative w-full h-40 bg-muted overflow-hidden">
                      {img ? (
                        <Image
                          src={img}
                          alt={lbl}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs">Sin imagen</span>
                        </div>
                      )}
                      {/* Nombre zona sobre imagen */}
                      <div className="absolute top-2 left-2">
                        <span className="text-lg font-bold text-white drop-shadow-md">{lbl}</span>
                      </div>
                      {/* Badge ocupación */}
                      <div className="absolute top-2 right-2">
                        {zona.isBlocked ? (
                          <Badge variant="destructive" className="text-[10px]">Bloqueada</Badge>
                        ) : ocu === total && total > 0 ? (
                          <Badge className="bg-red-500 text-white text-[10px]">Llena</Badge>
                        ) : lib === total ? (
                          <Badge className="bg-green-500 text-white text-[10px]">Libre</Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white text-[10px]">Parcial</Badge>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 space-y-2">
                      {desc && (
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{desc}</p>
                      )}
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === 100 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          {lib} libres
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          {ocu} ocupados
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Detalle de zona ──────────────────────────────────────────── */}
        {zonaSeleccionada && (
          <div className="space-y-4 py-2">
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 -ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => { setZonaSeleccionada(null); setImgError(false) }}
            >
              <ChevronLeft className="w-4 h-4" />
              Todas las zonas
            </Button>

            {/* Imagen grande con overlay */}
            {imagen && !imgError && (
              <div className="relative w-full h-52 rounded-xl overflow-hidden bg-muted">
                <Image
                  src={imagen}
                  alt={label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 700px"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <p className="text-xl font-bold drop-shadow">{label}</p>
                  {descZona && (
                    <p className="text-xs text-white/80 drop-shadow max-w-sm line-clamp-2">{descZona}</p>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                {libres} libre{libres !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                {ocupados} ocupado{ocupados !== 1 ? "s" : ""}
              </span>
              {zonaSeleccionada.isBlocked && (
                <Badge variant="destructive" className="text-xs">
                  {zonaSeleccionada.eventName ? `Bloqueada: ${zonaSeleccionada.eventName}` : "Bloqueada"}
                </Badge>
              )}
            </div>

            {/* Grid asientos */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SeatGrid seats={zonaSeleccionada.seats} isBlocked={zonaSeleccionada.isBlocked} />
            </div>

            <SeatLegend />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
TSEOF
ok "components/asientos-mapa-modal.tsx"

echo ""
echo "🔨  TypeScript check..."
pnpm exec tsc --noEmit --skipLibCheck 2>&1 | head -40 || true

echo ""
echo "🔨  Build..."
pnpm build

echo ""
echo -e "\033[0;32m════════════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅  v27 completado\033[0m"
echo -e "\033[0;32m════════════════════════════════════════════════════════════\033[0m"
echo ""
echo "  Archivos tocados:"
echo "    public/areas/                   → carpeta para las 4 fotos"
echo "    lib/area-images.ts              → mapa A/B/C/D → imagen"
echo "    lib/api.ts                      → zone = letra (A1→A, B3→B)"
echo "    components/asientos-mapa-modal.tsx → grilla 2x2 con foto + detalle"
echo ""
echo -e "\033[1;33m  ⚠️  Copiá las 4 fotos antes del push:\033[0m"
echo "    public/areas/zona-a.jpg"
echo "    public/areas/zona-b.jpg"
echo "    public/areas/zona-c.jpg"
echo "    public/areas/zona-d.jpg"
echo ""