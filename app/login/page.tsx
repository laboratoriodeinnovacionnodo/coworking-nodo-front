"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Lock, Mail, Armchair } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Usuario no válido",
        description: "Las credenciales ingresadas no son correctas. Verifica tu email y contraseña.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <Armchair className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestión de Asientos</h1>
              <p className="text-sm md:text-base text-primary mt-2">Ingresa tu contraseña para acceder</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-12 h-12 border-2 border-primary text-base rounded-lg focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-blue-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-12 h-12 border-2 border-primary text-base rounded-lg focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-blue-50"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold rounded-lg mt-6" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Accediendo...
                </>
              ) : (
                "Acceder al Sistema"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
