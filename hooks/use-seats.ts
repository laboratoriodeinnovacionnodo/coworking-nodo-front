"use client"

import { useState, useEffect } from "react"
import { areasApi, reservasApi, convertBackendAreaToSeat } from "@/lib/api"
import type { Seat, SeatStatus } from "@/types/seat"
import { usuariosApi } from "@/lib/api"
import type { BackendUsuario } from "@/types/seat"
import { useToast } from "@/hooks/use-toast"

export function useSeats() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [defaultUser, setDefaultUser] = useState<BackendUsuario | null>(null)
  const { toast } = useToast()

  const ensureDefaultUser = async () => {
    try {
      const usuarios = await usuariosApi.getAll()
      if (usuarios.length > 0) {
        setDefaultUser(usuarios[0])
        return usuarios[0]
      }

      // Crear usuario por defecto si no existe
      const newUser = await usuariosApi.create({
        nombre: "Usuario Coworking",
        email: "usuario@coworking.com",
      })
      setDefaultUser(newUser)
      return newUser
    } catch (err) {
      console.error("[v0] Error ensuring default user:", err)
      return null
    }
  }

  // Cargar datos del backend
  const fetchSeats = async () => {
    try {
      console.log("[v0] Starting to fetch seats...")
      setLoading(true)
      setError(null)

      const user = await ensureDefaultUser()

      const [areas, reservas] = await Promise.all([areasApi.getAll(), reservasApi.getAll().catch(() => [])])

      console.log("[v0] Areas loaded:", areas)
      console.log("[v0] Reservas loaded:", reservas)

      const seatsData = areas.map((area) => convertBackendAreaToSeat(area, reservas))
      console.log("[v0] Seats converted:", seatsData)

      setSeats(seatsData)
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al cargar datos"
      setError(errorMsg)
      console.error("[v0] Error fetching seats:", err)
      toast({
        variant: "destructive",
        title: "Error al cargar asientos",
        description: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSeatStatus = async (
    seatId: string,
    newStatus: SeatStatus,
    userName?: string,
    shareLimit?: number,
    peopleCount = 1,
  ) => {
    try {
      const seat = seats.find((s) => s.id === seatId)
      if (!seat || !seat.backendId) return

      // Asegurar que tenemos un usuario
      const user = defaultUser || (await ensureDefaultUser())
      if (!user) {
        throw new Error("No se pudo crear usuario")
      }

      if (newStatus === "available") {
        const reservas = await reservasApi.getAll()
        const activeReservas = reservas.filter((r) => r.areaId === seat.backendId && r.fin === null)

        await Promise.all(activeReservas.map((r) => reservasApi.completar(r.id)))

        toast({
          title: "Asiento liberado",
          description: `${seat.id} ahora está disponible`,
        })
      } else if (userName) {
        const detalles =
          newStatus === "for-share"
            ? `Para compartir (límite: ${shareLimit || 6}, personas: ${peopleCount})`
            : `Ocupado por ${peopleCount} persona(s)`

        await reservasApi.create({
          nombre: userName,
          detalles,
          usuarioId: user.id,
          areaId: seat.backendId,
        })

        // Verificar si debe cambiar a compartido
        if (newStatus === "for-share") {
          const reservas = await reservasApi.getAll()
          const activeReservas = reservas.filter((r) => r.areaId === seat.backendId && r.fin === null)

          if (activeReservas.length >= (shareLimit || 6)) {
            await areasApi.cambiarEstado(seat.backendId, "shared")
          } else {
            await areasApi.cambiarEstado(seat.backendId, newStatus)
          }
        } else {
          await areasApi.cambiarEstado(seat.backendId, newStatus)
        }

        toast({
          title: "Reserva creada exitosamente",
          description: `${seat.id} ha sido asignado a ${userName}`,
        })
      } else {
        await areasApi.cambiarEstado(seat.backendId, newStatus)

        toast({
          title: "Estado actualizado",
          description: `${seat.id} cambió de estado correctamente`,
        })
      }

      // Recargar datos
      await fetchSeats()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar"
      setError(errorMsg)
      console.error("[v0] Error updating seat:", err)
      toast({
        variant: "destructive",
        title: "Error al actualizar asiento",
        description: errorMsg,
      })
      throw err
    }
  }

  const toggleBlockAll = async (block: boolean) => {
    try {
      console.log("[v0] Toggling block all areas:", block)
      setLoading(true)

      // Usar la nueva función del API que actualiza todas las áreas
      await areasApi.bloquearTodas(block)

      toast({
        title: block ? "Áreas bloqueadas" : "Áreas desbloqueadas",
        description: block ? "Todas las áreas han sido bloqueadas por el evento" : "Todas las áreas han sido liberadas",
      })

      // Recargar datos después del bloqueo/desbloqueo
      await fetchSeats()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al bloquear áreas"
      setError(errorMsg)
      console.error("[v0] Error toggling block:", err)
      toast({
        variant: "destructive",
        title: "Error en la operación",
        description: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeats()
  }, [])

  return {
    seats,
    loading,
    error,
    fetchSeats,
    updateSeatStatus,
    toggleBlockAll,
    defaultUser,
  }
}
