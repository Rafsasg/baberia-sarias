"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Scissors,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  X,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { TimeSlot, Cita } from "@/types/database"
import { formatoCOP } from "@/lib/constants"

function getStatusInfo(estado: string) {
  switch (estado) {
    case "disponible":
      return { label: "Disponible", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: null }
    case "pendiente":
      return { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: AlertCircle }
    case "confirmada":
      return { label: "Confirmada", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: CheckCircle2 }
    default:
      return { label: estado, color: "bg-gray-500/10 text-gray-400", icon: null }
  }
}

export default function DashboardHome() {
  const [fecha, setFecha] = useState(new Date())
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [serviciosList, setServiciosList] = useState<{ slug: string; nombre: string; precio: number }[]>([])
  const [walkInForm, setWalkInForm] = useState<{
    cliente_nombre: string
    servicio: string
    hora_inicio: string
    metodo_pago: "efectivo" | "transferencia"
  }>({
    cliente_nombre: "",
    servicio: "corte",
    hora_inicio: "",
    metodo_pago: "efectivo" as const,
  })
  const [walkInLoading, setWalkInLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, confirmadas: 0, pendientes: 0, ingresos: 0 })

  const fechaStr = format(fecha, "yyyy-MM-dd")

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then((data) => {
        const activos = (data.servicios || []).filter((s: { slug: string; activo: boolean }) => s.activo)
        setServiciosList(activos)
        if (activos.length > 0 && !activos.find((s: { slug: string }) => s.slug === walkInForm.servicio)) {
          setWalkInForm((prev) => ({ ...prev, servicio: activos[0].slug }))
        }
      })
      .catch(() => {})
  }, [])

  const cargarSlots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/citas/disponibilidad?fecha=${fechaStr}`)
      const data = await res.json()
      setSlots(data.slots || [])
      calcularStats(data.slots || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fechaStr])

  useEffect(() => {
    cargarSlots()
  }, [cargarSlots])

  function calcularStats(slotsList: TimeSlot[]) {
    const confirmadas = slotsList.filter((s) => s.estado === "confirmada")
    const pendientes = slotsList.filter((s) => s.estado === "pendiente")
    const ingresos = confirmadas.reduce((sum, s) => {
      const servicio = s.cita?.servicio || ""
      const found = serviciosList.find((sv) => sv.slug === servicio)
      return sum + (found?.precio || 0)
    }, 0)

    setStats({
      total: confirmadas.length + pendientes.length,
      confirmadas: confirmadas.length,
      pendientes: pendientes.length,
      ingresos,
    })
  }

  function cambiarFecha(dias: number) {
    const nueva = new Date(fecha)
    nueva.setDate(nueva.getDate() + dias)
    setFecha(nueva)
  }

  async function handleWalkInSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!walkInForm.hora_inicio) return

    setWalkInLoading(true)
    try {
      const [h, m] = walkInForm.hora_inicio.split(":").map(Number)
      const hFin = Math.floor((h * 60 + m + 30) / 60)
      const mFin = (h * 60 + m + 30) % 60

      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...walkInForm,
          tipo: "presencial",
          fecha: fechaStr,
          hora_inicio: walkInForm.hora_inicio,
          hora_fin: `${String(hFin).padStart(2, "0")}:${String(mFin).padStart(2, "0")}`,
        }),
      })

      if (res.ok) {
        setShowWalkIn(false)
        setWalkInForm({
          cliente_nombre: "",
          servicio: "corte",
          hora_inicio: "",
          metodo_pago: "efectivo",
        })
        cargarSlots()
      } else {
        const err = await res.json()
        alert(err.error || "Error al crear cita")
      }
    } catch {
      alert("Error de conexión")
    } finally {
      setWalkInLoading(false)
    }
  }

  async function handleConfirmarCita(citaId: string) {
    const res = await fetch(`/api/citas/${citaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "confirmada" }),
    })
    if (res.ok) cargarSlots()
  }

  async function handleCancelarCita(citaId: string) {
    const res = await fetch(`/api/citas/${citaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "cancelada" }),
    })
    if (res.ok) cargarSlots()
  }

  const hoy = format(new Date(), "yyyy-MM-dd")
  const esHoy = fechaStr === hoy
  const slotsDisponibles = slots.filter((s) => s.estado === "disponible").length

  const horasOcupadas = slots
    .filter((s) => s.estado === "confirmada" || s.estado === "pendiente")
    .map((s) => s.hora_inicio)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {esHoy ? "Hoy" : format(fecha, "EEEE d", { locale: es })}
          </h1>
          <p className="text-muted-foreground text-sm">
            {format(fecha, "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => cambiarFecha(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!esHoy && (
            <Button variant="outline" size="sm" onClick={() => setFecha(new Date())}>
              Hoy
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => cambiarFecha(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Citas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-green-400">{stats.confirmadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-yellow-400">{stats.pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-primary">{formatoCOP(stats.ingresos)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {slotsDisponibles} slots disponibles de {slots.length}
          </span>
        </div>
        <Button onClick={() => setShowWalkIn(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Walk-in
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Cargando horarios...
            </div>
          ) : slots.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay horarios disponibles para este día
            </div>
          ) : (
            <div className="divide-y divide-border">
              {slots.map((slot) => {
                const info = getStatusInfo(slot.estado)
                const Icon = info.icon
                const servicioLabel =
                  serviciosList.find((s) => s.slug === slot.cita?.servicio)?.nombre
                  || slot.cita?.servicio || ""

                return (
                  <div
                    key={slot.hora_inicio}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      slot.estado === "pendiente" && "bg-yellow-500/5",
                      slot.estado === "confirmada" && "bg-blue-500/5"
                    )}
                  >
                    <span className="text-sm font-mono w-16 text-muted-foreground">
                      {slot.hora_inicio}
                    </span>

                    <div
                      className={cn(
                        "flex-1 flex items-center gap-3 rounded-lg px-3 py-2",
                        info.color
                      )}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" />}
                      <span className="text-sm font-medium">
                        {slot.estado === "disponible"
                          ? "Disponible"
                          : slot.cita?.cliente_nombre}
                      </span>
                      {slot.cita && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {servicioLabel}
                          </Badge>
                          <Badge
                            variant={
                              slot.cita.tipo === "presencial" ? "secondary" : "info"
                            }
                            className="text-xs"
                          >
                            {slot.cita.tipo === "presencial"
                              ? "Presencial"
                              : "Web"}
                          </Badge>
                        </>
                      )}
                    </div>

                    {slot.estado === "pendiente" && slot.cita && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => handleConfirmarCita(slot.cita!.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleCancelarCita(slot.cita!.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showWalkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registrar Walk-in</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowWalkIn(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWalkInSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del cliente</Label>
                  <Input
                    placeholder="Ej: Juan Pérez"
                    value={walkInForm.cliente_nombre}
                    onChange={(e) =>
                      setWalkInForm({ ...walkInForm, cliente_nombre: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Servicio</Label>
                  <Select
                    value={walkInForm.servicio}
                    onValueChange={(v: string) =>
                      setWalkInForm({ ...walkInForm, servicio: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviciosList.map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Select
                    value={walkInForm.hora_inicio}
                    onValueChange={(v) =>
                      setWalkInForm({ ...walkInForm, hora_inicio: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const opciones: string[] = []
                        for (let h = 9; h < 20; h++) {
                          for (const m of [0, 30]) {
                            const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
                            opciones.push(hora)
                          }
                        }
                        return opciones
                      })().map((hora) => (
                        <SelectItem
                          key={hora}
                          value={hora}
                          disabled={horasOcupadas.includes(hora)}
                        >
                          {hora}
                          {horasOcupadas.includes(hora) ? " (ocupado)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <Select
                    value={walkInForm.metodo_pago}
                    onValueChange={(v: "efectivo" | "transferencia") =>
                      setWalkInForm({ ...walkInForm, metodo_pago: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={walkInLoading}>
                  {walkInLoading ? "Registrando..." : "Registrar Walk-in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
