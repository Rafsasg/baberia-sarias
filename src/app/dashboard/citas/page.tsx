"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Phone,
  Scissors,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Cita } from "@/types/database"

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todas")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [fecha, setFecha] = useState(new Date())
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})

  const fechaStr = format(fecha, "yyyy-MM-dd")

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then((data) => {
        const names: Record<string, string> = {}
        ;(data.servicios || []).forEach((s: { slug: string; nombre: string }) => {
          names[s.slug] = s.nombre
        })
        setServiceNames(names)
      })
      .catch(() => {})
  }, [])

  const cargarCitas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/citas?fecha=${fechaStr}`)
      const data = await res.json()
      setCitas(data.citas || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fechaStr])

  useEffect(() => {
    cargarCitas()
  }, [cargarCitas])

  async function handleEstado(id: string, estado: "confirmada" | "cancelada") {
    const res = await fetch(`/api/citas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    if (res.ok) cargarCitas()
  }

  const citasFiltradas = citas.filter((c) => {
    if (filtroEstado !== "todas" && c.estado !== filtroEstado) return false
    if (filtroTipo !== "todos" && c.tipo !== filtroTipo) return false
    if (
      search &&
      !c.cliente_nombre.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestión de Citas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            const d = new Date(fecha); d.setDate(d.getDate() - 1); setFecha(d)
          }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(fecha, "d MMM, yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="icon" onClick={() => {
            const d = new Date(fecha); d.setDate(d.getDate() + 1); setFecha(d)
          }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFecha(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[130px]">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="confirmada">Confirmadas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Cargando citas...
            </div>
          ) : citasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay citas para mostrar
            </div>
          ) : (
            <div className="divide-y divide-border">
              {citasFiltradas.map((cita) => (
                <div
                  key={cita.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="w-16 text-sm font-mono text-muted-foreground">
                    {cita.hora_inicio}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {cita.cliente_nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {serviceNames[cita.servicio] || cita.servicio}
                      </Badge>
                      <Badge
                        variant={
                          cita.estado === "confirmada"
                            ? "success"
                            : cita.estado === "pendiente"
                              ? "warning"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {cita.estado}
                      </Badge>
                      <Badge
                        variant={cita.tipo === "web" ? "info" : "secondary"}
                        className="text-xs"
                      >
                        {cita.tipo}
                      </Badge>
                    </div>
                  </div>

                  {cita.cliente_telefono && (
                    <a
                      href={`https://wa.me/${cita.cliente_telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  {cita.estado === "pendiente" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        onClick={() => handleEstado(cita.id, "confirmada")}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleEstado(cita.id, "cancelada")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {cita.estado === "confirmada" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleEstado(cita.id, "cancelada")}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
