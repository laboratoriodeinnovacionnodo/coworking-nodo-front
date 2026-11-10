/**
 * Áreas del calendario-back que corresponden al coworking.
 * Debe estar sincronizado con calendario-nodo-back/src/common/enums/coworking-areas.ts
 */
export const CODIGOS_COWORKING = ["A1", "A2", "B1", "B2", "B3", "B4", "C1", "C2", "C3"] as const
export type CodigoCoworking = (typeof CODIGOS_COWORKING)[number]

const POR_AREA: Record<string, CodigoCoworking[]> = {
  COWORKING:        [...CODIGOS_COWORKING],
  COWORKING_ZONA_A: ["A1", "A2"],
  COWORKING_ZONA_B: ["B1", "B2", "B3", "B4"],
  COWORKING_ZONA_C: ["C1", "C2", "C3"],
  COWORKING_A1: ["A1"], COWORKING_A2: ["A2"],
  COWORKING_B1: ["B1"], COWORKING_B2: ["B2"], COWORKING_B3: ["B3"], COWORKING_B4: ["B4"],
  COWORKING_C1: ["C1"], COWORKING_C2: ["C2"], COWORKING_C3: ["C3"],
}

/** ¿El área del calendario pertenece al coworking (completo, zona o código)? */
export function esAreaCoworking(area: string): boolean {
  return area in POR_AREA
}

/** Códigos de coworking cubiertos por una lista de áreas del calendario. */
export function codigosCoworking(areas: string[] | undefined): Set<string> {
  const set = new Set<string>()
  for (const a of areas ?? []) POR_AREA[a]?.forEach((c) => set.add(c))
  return set
}

/** Código de un área del backend: usa `codigo` y, si no está cargado, deduce desde el nombre ("A1"). */
export function codigoDeArea(area: { codigo?: string | null; nombre: string }): string {
  return area.codigo ?? area.nombre.replace(/\s+/g, "").toUpperCase()
}

const ZONA_EVENTO_LABEL: Record<string, string> = {
  COWORKING_ZONA_A: "Zona A · Sillones Naranjas",
  COWORKING_ZONA_B: "Zona B · Sillones Rojos",
  COWORKING_ZONA_C: "Zona C · Semicírculos Negros",
}

/** Etiqueta legible de un área de evento del calendario (COWORKING_B3 → "Coworking B3"). */
export function etiquetaAreaEvento(area: string): string {
  if (area === "COWORKING") return "Coworking completo"
  if (ZONA_EVENTO_LABEL[area]) return ZONA_EVENTO_LABEL[area]
  if (area.startsWith("COWORKING_")) return `Coworking ${area.slice("COWORKING_".length)}`
  return area.split("_").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ")
}
