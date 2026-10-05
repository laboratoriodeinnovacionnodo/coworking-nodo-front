/**
 * hooks/use-seats.ts
 *
 * CAMBIO v34: fetchSeats() usa areasApi.getEstadoActual() — el endpoint
 * que calcula el estado en tiempo real — en lugar de areasApi.getAll().
 * Esto garantiza que los asientos se liberan automáticamente cuando vence
 * el horario de una ocupación, sin intervención manual.
 */
"use client"

import { useState, useCallback, useRef } from "react"
import {
  areasApi,
  reservasApi,
  convertBackendAreaToSeat,
  type BackendArea,
} from "@/lib/api"
import type { Seat } from "@/types/seat"

export function useSeats() {
  const [seats,   setSeats]   = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Carga el estado actual de todos los asientos.
   * Usa /areas/estado-actual para obtener el estado calculado en tiempo real.
   */
  const fetchSeats = useCallback(async () => {
    // Cancelar fetch anterior si sigue en vuelo
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const [areas, reservas] = await Promise.all([
        areasApi.getEstadoActual(), // ← tiempo real
        reservasApi.getAll(),
      ])

      if (controller.signal.aborted) return

      const mapped = areas.map((area: BackendArea) =>
        convertBackendAreaToSeat(area, reservas),
      )
      setSeats(mapped)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      console.error("[useSeats] fetchSeats error:", err)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  /**
   * Bloquea o libera todas las áreas de un solo golpe.
   * Llama a PATCH /areas/bloquear-todas/:estado y luego refresca.
   */
  const toggleBlockAll = useCallback(
    async (block: boolean) => {
      await areasApi.bloquearTodas(block ? "OCUPADO" : "LIBRE")
      await fetchSeats()
    },
    [fetchSeats],
  )

  return { seats, loading, fetchSeats, toggleBlockAll }
}
