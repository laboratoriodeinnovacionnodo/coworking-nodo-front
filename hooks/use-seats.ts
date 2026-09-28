"use client"

import { useState, useCallback, useRef } from "react"
import type { Seat, Recepcion } from "@/types/seat"
import { areasApi, reservasApi, convertBackendAreaToSeat } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const POLLING_MS = 30_000

export function useSeats() {
  const { toast } = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast

  const [seats,   setSeats]   = useState<Seat[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [areas, reservas] = await Promise.all([areasApi.getAll(), reservasApi.getAll()])
      setSeats(areas.map((area) => convertBackendAreaToSeat(area, reservas)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar áreas")
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSeatStatus = useCallback(async (
    seat:         Seat,
    newStatus:    string,
    userName?:    string,
    peopleCount?: number,
    shareLimit?:  number,
    recepcion?:   Recepcion,
    receptor?:    string,
    gmail?:       string,
  ) => {
    if (!seat.backendId) throw new Error("Asiento sin ID de backend")

    try {
      if (newStatus === "occupied" || newStatus === "for-share" || newStatus === "shared") {
        if (!userName) throw new Error("Nombre de usuario requerido")

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

        await reservasApi.create({
          nombre: userName,
          detalles,
          usuarioId,
          areaId: seat.backendId,
          ...(recepcion && { recepcion }),
          ...(receptor  && { receptor }),
          ...(gmail     && { gmail }),
        })

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
