"use client"

/**
 * hooks/use-evento-activo.ts
 *
 * Detecta si hay un evento del calendario-back activo AHORA MISMO
 * en el área COWORKING (horario Argentina UTC-3).
 *
 * Polling cada INTERVALO_MS con AbortController para cancelar
 * fetches en vuelo al desmontar — evita race conditions al navegar.
 */

import { useState, useEffect, useRef } from "react"

const EVENTOS_BASE    = process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? ""
const INTERVALO_MS    = 60_000
const ESTADOS_INACTIVOS = new Set(["CANCELADO", "FINALIZADO"])

export interface EventoActivo {
  id:          string
  titulo:      string
  fechaDesde:  string
  fechaHasta:  string
  horaDesde:   string
  horaHasta:   string
  tipoEvento:  string
  areas?:      string[]
  organizadorSolicitante?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function ahoraArgentina(): { fecha: string; minutos: number } {
  const ar      = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const fecha   = ar.toISOString().split("T")[0]
  const minutos = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  return { fecha, minutos }
}

function estaActivoAhora(ev: EventoActivo): boolean {
  if (ESTADOS_INACTIVOS.has(ev.tipoEvento)) return false
  if (!Array.isArray(ev.areas) || !ev.areas.includes("COWORKING")) return false

  const { fecha, minutos } = ahoraArgentina()
  const evDesde = ev.fechaDesde.split("T")[0]
  const evHasta = ev.fechaHasta.split("T")[0]

  if (fecha < evDesde || fecha > evHasta) return false

  const inicioMin = timeToMinutes(ev.horaDesde)
  const finMin    = timeToMinutes(ev.horaHasta)

  if (evDesde === evHasta) return minutos >= inicioMin && minutos < finMin
  if (fecha === evDesde)   return minutos >= inicioMin
  if (fecha === evHasta)   return minutos < finMin
  return true
}

async function fetchEventoActivo(signal: AbortSignal): Promise<EventoActivo | null> {
  if (!EVENTOS_BASE) return null

  try {
    const { fecha } = ahoraArgentina()
    const [y, m]    = fecha.split("-").map(Number)

    // Consultar mes actual y el siguiente si estamos cerca del fin de mes
    const meses: { y: number; m: number }[] = [{ y, m }]
    const diasEnMes = new Date(y, m, 0).getDate()
    const diaActual = Number(fecha.split("-")[2])
    if (diasEnMes - diaActual <= 3) {
      meses.push(m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 })
    }

    const resultados = await Promise.all(
      meses.map(async ({ y, m }) => {
        try {
          const res = await fetch(
            `${EVENTOS_BASE}/calendar?year=${y}&month=${m}`,
            { cache: "no-store", signal }
          )
          if (!res.ok) return []
          const data = await res.json()
          return (data.events ?? []) as EventoActivo[]
        } catch {
          return []
        }
      })
    )

    const todos = resultados.flat()

    // Deduplicar
    const vistos = new Set<string>()
    const unicos = todos.filter((e) => {
      if (vistos.has(e.id)) return false
      vistos.add(e.id)
      return true
    })

    return unicos.find(estaActivoAhora) ?? null
  } catch (err) {
    // AbortError es esperado al desmontar — ignorar silenciosamente
    if (err instanceof DOMException && err.name === "AbortError") return null
    return null
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEventoActivo() {
  const [eventoActivo, setEventoActivo] = useState<EventoActivo | null>(null)
  const [cargando,     setCargando]     = useState(true)

  // Ref para el AbortController activo y el intervalo
  const abortRef    = useRef<AbortController | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let montado = true

    const ejecutar = async () => {
      // Cancelar fetch anterior si sigue en vuelo
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      const activo = await fetchEventoActivo(abortRef.current.signal)

      // Solo actualizar estado si el componente sigue montado
      if (montado) {
        setEventoActivo(activo)
        setCargando(false)
      }
    }

    // Ejecución inmediata
    ejecutar()

    // Polling
    intervalRef.current = setInterval(ejecutar, INTERVALO_MS)

    return () => {
      // Cleanup al desmontar: cancelar fetch en vuelo + limpiar intervalo
      montado = false
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, []) // sin dependencias → solo monta/desmonta una vez

  return { eventoActivo, cargando }
}
