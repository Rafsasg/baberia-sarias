"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Scissors,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatoCOP } from "@/lib/constants"
import type { ServicioItem } from "@/types/database"

interface ServicioForm {
  slug: string
  nombre: string
  descripcion: string
  precio: string
  duracion: string
  incluye: string[]
}

const emptyForm: ServicioForm = {
  slug: "",
  nombre: "",
  descripcion: "",
  precio: "",
  duracion: "30",
  incluye: [""],
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<ServicioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServicioForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const cargarServicios = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/servicios")
      const data = await res.json()
      setServicios(data.servicios || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarServicios()
  }, [cargarServicios])

  function abrirNuevo() {
    setEditingId(null)
    setForm(emptyForm)
    setError("")
    setShowModal(true)
  }

  function abrirEditar(s: ServicioItem) {
    setEditingId(s.id)
    setForm({
      slug: s.slug,
      nombre: s.nombre,
      descripcion: s.descripcion,
      precio: String(s.precio),
      duracion: String(s.duracion),
      incluye: s.incluye.length > 0 ? s.incluye : [""],
    })
    setError("")
    setShowModal(true)
  }

  function handleIncluyeChange(index: number, value: string) {
    const newIncluye = [...form.incluye]
    newIncluye[index] = value
    setForm({ ...form, incluye: newIncluye })
  }

  function addIncluyeItem() {
    setForm({ ...form, incluye: [...form.incluye, ""] })
  }

  function removeIncluyeItem(index: number) {
    const newIncluye = form.incluye.filter((_, i) => i !== index)
    setForm({ ...form, incluye: newIncluye.length > 0 ? newIncluye : [""] })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const precio = parseInt(form.precio)
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un número válido")
      setSaving(false)
      return
    }

    const duracion = parseInt(form.duracion)
    if (isNaN(duracion) || duracion <= 0) {
      setError("La duración debe ser un número válido")
      setSaving(false)
      return
    }

    const incluye = form.incluye.filter((i) => i.trim() !== "")

    const payload = {
      slug: form.slug,
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio,
      duracion,
      incluye,
    }

    try {
      const res = editingId
        ? await fetch(`/api/servicios/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/servicios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al guardar")
        return
      }

      setShowModal(false)
      cargarServicios()
    } catch {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return

    try {
      const res = await fetch(`/api/servicios/${id}`, { method: "DELETE" })
      if (res.ok) cargarServicios()
    } catch {
      console.error("Error al eliminar")
    }
  }

  async function toggleActivo(s: ServicioItem) {
    await fetch(`/api/servicios/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !s.activo }),
    })
    cargarServicios()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona los servicios, precios y lo que incluye cada uno
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Cargando servicios...
            </div>
          ) : servicios.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay servicios registrados. Crea tu primer servicio.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {servicios.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-start gap-4 px-4 py-4",
                    !s.activo && "opacity-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Scissors className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{s.nombre}</h3>
                      <Badge variant={s.activo ? "success" : "secondary"}>
                        {s.activo ? "Activo" : "Inactivo"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {s.duracion} min
                      </span>
                    </div>
                    {s.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {s.descripcion}
                      </p>
                    )}
                    {s.incluye.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.incluye.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Check className="w-3 h-3 mr-1 text-primary" />
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-lg font-bold text-primary mt-2">
                      {formatoCOP(s.precio)}
                    </p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleActivo(s)}
                    >
                      <Badge
                        variant={s.activo ? "secondary" : "success"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {s.activo ? "Desactivar" : "Activar"}
                      </Badge>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => abrirEditar(s)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">
                  {editingId ? "Editar Servicio" : "Nuevo Servicio"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Identificador (slug)</Label>
                    <Input
                      id="slug"
                      placeholder="ej: corte-barba"
                      value={form.slug}
                      onChange={(e) =>
                        setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                      }
                      required
                      disabled={!!editingId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      placeholder="ej: Corte + Barba"
                      value={form.nombre}
                      onChange={(e) =>
                        setForm({ ...form, nombre: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    placeholder="Describe el servicio"
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precio">Precio ($)</Label>
                    <Input
                      id="precio"
                      type="number"
                      min="0"
                      placeholder="15000"
                      value={form.precio}
                      onChange={(e) =>
                        setForm({ ...form, precio: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duracion">Duración (minutos)</Label>
                    <Input
                      id="duracion"
                      type="number"
                      min="5"
                      step="5"
                      placeholder="30"
                      value={form.duracion}
                      onChange={(e) =>
                        setForm({ ...form, duracion: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>¿Qué incluye?</Label>
                  <div className="space-y-2">
                    {form.incluye.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="Ej: Toalla caliente"
                          value={item}
                          onChange={(e) => handleIncluyeChange(i, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-destructive"
                          onClick={() => removeIncluyeItem(i)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIncluyeItem}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar item
                  </Button>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : editingId
                      ? "Guardar Cambios"
                      : "Crear Servicio"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
