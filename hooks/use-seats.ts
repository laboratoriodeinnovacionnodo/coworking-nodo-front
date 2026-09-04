"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { areasApi, reservasApi, convertBackendAreaToSeat } from "@/lib/api"
import type { Seat } from "@/types/seat"
import { useToast } from "@/hooks/use-toast"

// Polling cada 30s — suficiente para datos en tiempo real sin saturar la DB
const POLLING_MS = 30_000

export function useSeats() {
  const { toast }    = useToast()
  const toastRef     = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [seats,   setSeats]   = useState<Seat[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── fetchSeats: estable, no se recrea entre renders ──────────────────────
  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [areas, reservas] = await Promise.all([
        areasApi.getAll(),
        reservasApi.getAll(),
      ])
      setSeats(areas.map((area) => convertBackendAreaToSeat(area, reservas)))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar áreas"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, []) // sin deps → referencia estable entre renders

  // ── updateSeatStatus ─────────────────────────────────────────────────────
  const updateSeatStatus = useCallback(async (
    seat: Seat,
    newStatus: string,
    userName?: string,
    peopleCount?: number,
    shareLimit?: number,
  ) => {
    if (!seat.backendId) throw new Error("Asiento sin ID de backend")

    try {
      if (newStatus === "occupied" || newStatus === "for-share" || newStatus === "shared") {
        if (!userName) throw new Error("Nombre de usuario requerido")

        // Buscar usuario por nombre
        const user = await (async () => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL ?? ""}/usuario`,
              { headers: { "Content-Type": "application/json" } }
            )
            if (!res.ok) return null
            const usuarios = await res.json()
            return usuarios.find((u: { nombre: string; id: number }) => u.nombre === userName) ?? null
          } catch { return null }
        })()

        const usuarioId = user?.id ?? 1
        const detalles  =
          newStatus === "for-share"
            ? `Para compartir (límite: ${shareLimit || 6}, personas: ${peopleCount})`
            : `Ocupado por ${peopleCount} persona(s)`

        await reservasApi.create({ nombre: userName, detalles, usuarioId, areaId: seat.backendId })

        if (newStatus === "for-share") {
          const reservas    = await reservasApi.getAll()
          const activeCount = reservas.filter((r) => r.areaId === seat.backendId && r.fin === null).length
          await areasApi.cambiarEstado(seat.backendId, activeCount >= (shareLimit || 6) ? "shared" : newStatus)
        } else {
          await areasApi.cambiarEstado(seat.backendId, newStatus)
        }

        toastRef.current({ title: "Reserva creada", description: `${seat.id} asignado a ${userName}` })
      } else {
        await areasApi.cambiarEstado(seat.backendId, newStatus)
        toastRef.current({ title: "Estado actualizado", description: `${seat.id} cambió de estado` })
      }

      await fetchSeats()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar"
      setError(msg)
      toastRef.current({ variant: "destructive", title: "Error al actualizar asiento", description: msg })
      throw err
    }
  }, [fetchSeats])

  // ── toggleBlockAll ───────────────────────────────────────────────────────
  const toggleBlockAll = useCallback(async (block: boolean) => {
    try {
      setLoading(true)
      await areasApi.bloquearTodas(block)
      toastRef.current({
        title:       block ? "Coworking bloqueado" : "Coworking desbloqueado",
        description: block ? "Todas las áreas están bloqueadas" : "Las áreas volvieron a su estado libre",
      })
      await fetchSeats()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al operar"
      setError(msg)
      toastRef.current({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setLoading(false)
    }
  }, [fetchSeats])

  return { seats, loading, error, fetchSeats, updateSeatStatus, toggleBlockAll, POLLING_MS }
}
