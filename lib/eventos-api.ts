/**
 * lib/eventos-api.ts
 * Cliente de solo-lectura para el calendario-back (NEXT_PUBLIC_EVENTOS_API_URL).
 * Se usa únicamente para verificar conflictos al agendar ocupaciones.
 */

const EVENTOS_BASE =
  process.env.NEXT_PUBLIC_EVENTOS_API_URL ?? ""

// Estados que NO bloquean el agendado (el evento ya no está vigente)
const ESTADOS_INACTIVOS = new Set(["CANCELADO", "FINALIZADO"])

export interface EventoCalendario {
  id:          string
  titulo:      string
  fechaDesde:  string   // ISO o "YYYY-MM-DD"
  fechaHasta:  string
  horaDesde:   string   // "HH:mm"
  horaHasta:   string
  tipoEvento:  string
  areas?:      string[] // e.g. ["COWORKING", "AUDITORIO"]
}

interface CalendarResponse {
  events:      EventoCalendario[]
  totalEvents: number
}

/**
 * Trae los eventos del calendario-back para un rango de meses.
 * Necesitamos cubrir un rango porque el usuario puede agendar a futuro
 * cruzando meses (fechaDesde en un mes, fechaHasta en otro).
 */
async function fetchEventosMes(year: number, month: number): Promise<EventoCalendario[]> {
  if (!EVENTOS_BASE) return []
  try {
    const res = await fetch(
      `${EVENTOS_BASE}/calendar?year=${year}&month=${month}`,
      { cache: "no-store" },
    )
    if (!res.ok) return []
    const data: CalendarResponse = await res.json()
    return data.events ?? []
  } catch {
    return []
  }
}

/**
 * Retorna los eventos activos del calendario-back que:
 *   · tengan área COWORKING
 *   · NO estén CANCELADOS ni FINALIZADOS
 *   · su rango de fechas se superponga con [desde, hasta]
 *
 * Cubre hasta 3 meses para soportar rangos multi-mes.
 */
export async function getEventosActivosCoworking(
  fechaDesde: string,
  fechaHasta: string,
): Promise<EventoCalendario[]> {
  if (!EVENTOS_BASE || !fechaDesde || !fechaHasta) return []

  // Determinar los meses a consultar
  const [yD, mD] = fechaDesde.split("-").map(Number)
  const [yH, mH] = fechaHasta.split("-").map(Number)

  const meses: { year: number; month: number }[] = []
  let y = yD, m = mD
  while (y < yH || (y === yH && m <= mH)) {
    meses.push({ year: y, month: m })
    m++
    if (m > 12) { m = 1; y++ }
    if (meses.length > 6) break // límite de seguridad
  }

  const resultados = await Promise.all(meses.map(({ year, month }) => fetchEventosMes(year, month)))
  const todos = resultados.flat()

  // Deduplicar por id
  const vistos = new Set<string>()
  const deduplicados = todos.filter((e) => {
    if (vistos.has(e.id)) return false
    vistos.add(e.id)
    return true
  })

  return deduplicados.filter((e) => {
    // Solo eventos activos con área COWORKING
    if (ESTADOS_INACTIVOS.has(e.tipoEvento)) return false
    if (!Array.isArray(e.areas) || !e.areas.includes("COWORKING")) return false

    // Superposición de fechas con el rango pedido
    const evDesde = e.fechaDesde.split("T")[0]
    const evHasta = e.fechaHasta.split("T")[0]
    return evDesde <= fechaHasta && evHasta >= fechaDesde
  })
}
