"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { adminsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Admin {
  id: number
  nombre: string
  email: string
}

interface AuthContextType {
  admin: Admin | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const storedAdmin = localStorage.getItem("coworking_admin")
    if (storedAdmin) {
      try {
        setAdmin(JSON.parse(storedAdmin))
      } catch (error) {
        console.error("[v0] Error parsing stored admin:", error)
        localStorage.removeItem("coworking_admin")
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const data = await adminsApi.login(email, password)

      const adminData: Admin = {
        id: data.id,
        nombre: data.nombre,
        email: data.email,
      }

      setAdmin(adminData)
      localStorage.setItem("coworking_admin", JSON.stringify(adminData))

      toast({
        title: "Ingreso exitoso",
        description: `Bienvenido al sistema, ${adminData.nombre}`,
      })

      router.push("/")
    } catch (error) {
      console.error("[v0] Login error:", error)
      throw error
    }
  }

  const logout = () => {
    setAdmin(null)
    localStorage.removeItem("coworking_admin")

    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    })

    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ admin, isAdmin: admin !== null, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return context
}
