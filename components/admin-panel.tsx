"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"

interface AdminPanelProps {
  isBlocked: boolean
  eventName?: string
  onToggleBlock: (block: boolean, eventName?: string) => void
}

export function AdminPanel({ isBlocked, eventName, onToggleBlock }: AdminPanelProps) {
  const [newEventName, setNewEventName] = useState("")

  const handleBlock = () => {
    if (newEventName.trim()) {
      onToggleBlock(true, newEventName)
      setNewEventName("")
    }
  }

  const handleUnblock = () => {
    onToggleBlock(false)
  }

  return (
    <Card className="border-2">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          {isBlocked ? (
            <>
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <span>Área bloqueada</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span>Administración</span>
            </>
          )}
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {isBlocked ? `Evento activo: ${eventName}` : "Gestiona eventos y bloquea el área"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-4">
        {!isBlocked ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="eventName" className="text-sm md:text-base">Nombre del evento</Label>
              <Input
                id="eventName"
                placeholder="Ej: Conferencia anual"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button 
              onClick={handleBlock} 
              variant="destructive" 
              className="w-full text-sm md:text-base" 
              disabled={!newEventName.trim()}
            >
              Bloquear área
            </Button>
          </>
        ) : (
          <Button onClick={handleUnblock} className="w-full text-sm md:text-base">
            Desbloquear área
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
