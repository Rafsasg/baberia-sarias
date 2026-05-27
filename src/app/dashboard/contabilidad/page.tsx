"use client"

import { useState, useEffect, useCallback } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Wallet, TrendingUp, TrendingDown, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { formatoCOP } from "@/lib/constants"
import { es } from "date-fns/locale"
import type { Transaccion } from "@/types/database"

const COLORS = {
  corte: "#c49a3c",
  barba: "#6366f1",
  combo: "#22c55e",
  efectivo: "#22c55e",
  transferencia: "#6366f1",
  ingreso: "#22c55e",
  egreso: "#ef4444",
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

export default function ContabilidadPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [serviciosList, setServiciosList] = useState<{ slug: string; nombre: string }[]>([])
  const [formData, setFormData] = useState({
    tipo: "ingreso" as "ingreso" | "egreso",
    monto: "",
    categoria: "",
    metodo_pago: "efectivo" as "efectivo" | "transferencia",
    descripcion: "",
    fecha_creacion: format(new Date(), "yyyy-MM-dd"),
  })

  const cargarTransacciones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/transacciones?limit=500")
      const data = await res.json()
      setTransacciones(data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then((data) => {
        setServiciosList((data.servicios || []).map((s: { slug: string; nombre: string }) => ({ slug: s.slug, nombre: s.nombre })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    cargarTransacciones()
  }, [cargarTransacciones])

  const ingresos = transacciones.filter((t) => t.tipo === "ingreso")
  const egresos = transacciones.filter((t) => t.tipo === "egreso")

  const totalIngresos = ingresos.reduce((s, t) => s + Number(t.monto), 0)
  const totalEgresos = egresos.reduce((s, t) => s + Number(t.monto), 0)
  const balanceNeto = totalIngresos - totalEgresos

  const ingresosPorServicio = ingresos.reduce(
    (acc, t) => {
      const cat = t.categoria
      acc[cat] = (acc[cat] || 0) + Number(t.monto)
      return acc
    },
    {} as Record<string, number>
  )

  const dataServicios = Object.entries(ingresosPorServicio)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

  const tendenciaMensual = (() => {
    const meses: Record<string, { ingresos: number; egresos: number }> = {}
    transacciones.forEach((t) => {
      const mes = t.fecha_creacion.slice(0, 7)
      if (!meses[mes]) meses[mes] = { ingresos: 0, egresos: 0 }
      if (t.tipo === "ingreso") meses[mes].ingresos += Number(t.monto)
      else meses[mes].egresos += Number(t.monto)
    })
    return Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, data]) => {
        const [_, m] = mes.split("-")
        return { mes: MESES[parseInt(m) - 1] || mes, ...data }
      })
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const monto = parseFloat(formData.monto)
    if (isNaN(monto) || monto <= 0) {
      alert("Monto inválido")
      return
    }

    try {
      const res = await fetch("/api/transacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: formData.tipo,
          monto,
          categoria: formData.categoria,
          metodo_pago: formData.tipo === "ingreso" ? formData.metodo_pago : null,
          descripcion: formData.descripcion || null,
          fecha_creacion: formData.fecha_creacion,
        }),
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          tipo: "ingreso",
          monto: "",
          categoria: "",
          metodo_pago: "efectivo",
          descripcion: "",
          fecha_creacion: format(new Date(), "yyyy-MM-dd"),
        })
        cargarTransacciones()
      } else {
        const err = await res.json()
        alert(err.error || "Error al crear transacción")
      }
    } catch {
      alert("Error de conexión")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Contabilidad</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Ingresos Totales
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-green-400">
              {formatoCOP(totalIngresos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Egresos Totales
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-red-400">
              {formatoCOP(totalEgresos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Balance Neto
            </CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p
              className={`text-2xl font-bold ${balanceNeto >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {formatoCOP(balanceNeto)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendencia de Ingresos vs Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tendenciaMensual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="mes" stroke="#a3a3a3" fontSize={12} />
                  <YAxis stroke="#a3a3a3" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [formatoCOP(Number(value)), ""]}
                  />
                  <Legend />
                  <Bar
                    dataKey="ingresos"
                    fill={COLORS.ingreso}
                    name="Ingresos"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="egresos"
                    fill={COLORS.egreso}
                    name="Egresos"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ingresos por Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataServicios}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {dataServicios.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#6366f1"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [formatoCOP(Number(value)), ""]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Tendencia Mensual de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendenciaMensual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="mes" stroke="#a3a3a3" fontSize={12} />
                  <YAxis stroke="#a3a3a3" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [formatoCOP(Number(value)), ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke={COLORS.ingreso}
                    strokeWidth={2}
                    dot={{ fill: COLORS.ingreso, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Cargando...
            </div>
          ) : transacciones.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay transacciones registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Método</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {transacciones.map((t) => (
                    <tr key={t.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-3 font-mono text-xs">
                        {format(new Date(t.fecha_creacion), "dd/MM/yy")}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${t.tipo === "ingreso" ? "text-green-400" : "text-red-400"}`}
                        >
                          {t.tipo === "ingreso" ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {t.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground capitalize">{t.categoria}</td>
                      <td className="p-3 text-muted-foreground">{t.metodo_pago || "-"}</td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                        {t.descripcion || "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        {formatoCOP(Number(t.monto))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nueva Transacción</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v: "ingreso" | "egreso") =>
                      setFormData({ ...formData, tipo: v, categoria: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingreso">Ingreso</SelectItem>
                      <SelectItem value="egreso">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(v) =>
                      setFormData({ ...formData, categoria: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.tipo === "ingreso"
                        ? serviciosList.map((s) => (
                            <SelectItem key={s.slug} value={s.slug}>
                              {s.nombre}
                            </SelectItem>
                          ))
                        : ["suministros", "servicios", "marketing", "otros"].map(
                            (cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </SelectItem>
                            )
                          )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto ($)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    placeholder="0.00"
                    value={formData.monto}
                    onChange={(e) =>
                      setFormData({ ...formData, monto: e.target.value })
                    }
                    required
                  />
                </div>

                {formData.tipo === "ingreso" && (
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select
                      value={formData.metodo_pago}
                      onValueChange={(v: "efectivo" | "transferencia") =>
                        setFormData({ ...formData, metodo_pago: v })
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
                )}

                <div className="space-y-2">
                  <Label>Descripción (opcional)</Label>
                  <Input
                    placeholder="Detalle de la transacción"
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                  />
                </div>

                <Button type="submit" className="w-full">
                  Registrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
