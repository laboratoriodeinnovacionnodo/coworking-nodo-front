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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isBlocked ? (
            <>
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Área bloqueada</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>Panel de Administración</span>
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isBlocked ? `Evento activo: ${eventName}` : "Gestiona eventos y bloquea el área cuando sea necesario"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isBlocked ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="eventName">Nombre del evento</Label>
              <Input
                id="eventName"
                placeholder="Ej: Conferencia anual"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
              />
            </div>
            <Button onClick={handleBlock} variant="destructive" className="w-full" disabled={!newEventName.trim()}>
              Bloquear área por evento
            </Button>
          </>
        ) : (
          <Button onClick={handleUnblock} className="w-full">
            Desbloquear área
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
