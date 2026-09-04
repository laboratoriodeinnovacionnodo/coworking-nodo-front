"use client"

import type { EventoActivo } from "@/hooks/use-evento-activo"
import { CalendarDays, Clock, Users, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const TIPO_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  EN_CURSO:   "En curso",
  FINALIZADO: "Finalizado",
  CANCELADO:  "Cancelado",
  MASIVO:     "Masivo",
  ESCOLAR:    "Escolar",
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  })
}

interface EventoActivoBannerProps {
  evento: EventoActivo
}

export function EventoActivoBanner({ evento }: EventoActivoBannerProps) {
  const mismaFecha = evento.fechaDesde.split("T")[0] === evento.fechaHasta.split("T")[0]

  return (
    <div
      className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3"
      role="alert"
    >
      {/* Ícono */}
      <div className="flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-orange-900">
            Coworking no disponible — evento en curso
          </p>
          <Badge
            variant="outline"
            className="text-[10px] border-orange-300 text-orange-700 bg-orange-100 px-1.5 py-0"
          >
            {TIPO_LABEL[evento.tipoEvento] ?? evento.tipoEvento}
          </Badge>
        </div>

        <p className="text-sm font-medium text-orange-800 truncate">
          {evento.titulo}
        </p>

        <div className="flex items-center gap-3 flex-wrap text-xs text-orange-700">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {mismaFecha
              ? formatFecha(evento.fechaDesde)
              : `${formatFecha(evento.fechaDesde)} → ${formatFecha(evento.fechaHasta)}`
            }
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {evento.horaDesde} – {evento.horaHasta}
          </span>
          {evento.organizadorSolicitante && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {evento.organizadorSolicitante}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
