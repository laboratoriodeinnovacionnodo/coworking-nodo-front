/**
 * lib/area-images.ts
 * Imagen por zona (letra: A, B, C, D).
 * Fotos en public/areas/
 */
export const AREA_IMAGES: Record<string, string> = {
  A: "/areas/zona-a.jpeg",
  B: "/areas/zona-b.jpeg",
  C: "/areas/zona-c.jpeg",
  D: "/areas/zona-d.jpeg",
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
