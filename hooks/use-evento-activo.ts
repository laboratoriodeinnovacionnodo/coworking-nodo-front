"use client"

/**
 * hooks/use-evento-activo.ts
 *
 * Detecta si hay un evento del calendario-back activo AHORA MISMO
 * en el área COWORKING (horario Argentina UTC-3).
 *
 * Hace polling cada INTERVALO_MS ms.
 * Retorna el evento activo o null.
 */

import { useState, useEffect, useRef, useCallback } from "react"

const EVENTOS_BASE = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? ""
const INTERVALO_MS = 60_000 // 1 minuto
const ESTADOS_INACTIVOS = new Set(["CANCELADO", "FINALIZADO"])

export interface EventoActivo {
  id:         string
  titulo:     string
  fechaDesde: string
  fechaHasta: string
  horaDesde:  string
  horaHasta:  string
  tipoEvento: string
  areas?:     string[]
  organizadorSolicitante?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** Hora y fecha actuales en Argentina (UTC-3), sin mutabilidad */
function ahoraArgentina(): { fecha: string; minutos: number } {
  const now      = new Date()
  const ar       = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const fecha    = ar.toISOString().split("T")[0]          // "YYYY-MM-DD"
  const minutos  = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  return { fecha, minutos }
}

/**
 * Dado un evento, determina si está activo en este instante.
 * Para eventos multi-día usa lógica de rango completo.
 */
function estaActivoAhora(ev: EventoActivo): boolean {
  if (ESTADOS_INACTIVOS.has(ev.tipoEvento)) return false
  if (!Array.isArray(ev.areas) || !ev.areas.includes("COWORKING")) return false

  const { fecha, minutos } = ahoraArgentina()
  const evDesde = ev.fechaDesde.split("T")[0]
  const evHasta = ev.fechaHasta.split("T")[0]

  // La fecha actual debe estar dentro del rango del evento
  if (fecha < evDesde || fecha > evHasta) return false

  const inicioMin = timeToMinutes(ev.horaDesde)
  const finMin    = timeToMinutes(ev.horaHasta)

  if (evDesde === evHasta) {
    // Mismo día: verificar rango horario exacto
    return minutos >= inicioMin && minutos < finMin
  }

  // Multi-día
  if (fecha === evDesde) return minutos >= inicioMin   // primer día: desde la hora de inicio
  if (fecha === evHasta) return minutos < finMin        // último día: hasta la hora de fin
  return true                                           // días intermedios: todo el día
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEventoActivo() {
  const [eventoActivo, setEventoActivo] = useState<EventoActivo | null>(null)
  const [cargando,     setCargando]     = useState(true)
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  const verificar = useCallback(async () => {
    if (!EVENTOS_BASE) { setCargando(false); return }

    try {
      const { fecha } = ahoraArgentina()
      const [y, m]    = fecha.split("-").map(Number)

      // Consultar mes actual (y el siguiente si estamos en los últimos días del mes)
      const meses: { y: number; m: number }[] = [{ y, m }]
      const diasEnMes = new Date(y, m, 0).getDate()
      const diaActual = Number(fecha.split("-")[2])
      if (diasEnMes - diaActual <= 3) {
        meses.push(m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 })
      }

      const resultados = await Promise.all(
        meses.map(({ y, m }) =>
          fetch(`${EVENTOS_BASE}/calendar?year=${y}&month=${m}`, { cache: "no-store" })
            .then((r) => r.ok ? r.json() : { events: [] })
            .then((d) => (d.events ?? []) as EventoActivo[])
            .catch(() => [] as EventoActivo[])
        )
      )

      const todos = resultados.flat()
      const activo = todos.find(estaActivoAhora) ?? null
      setEventoActivo(activo)
    } catch {
      // silencioso — no romper la UI si el calendario-back falla
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    verificar()
    intervalRef.current = setInterval(verificar, INTERVALO_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [verificar])

  return { eventoActivo, cargando }
}
