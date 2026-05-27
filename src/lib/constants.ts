export const HORARIO_INICIO = "09:00"
export const HORARIO_FIN = "20:00"
export const DURACION_SLOT = 30
export const TIEMPO_CONFIRMACION_MIN = 5

export const PRECIOS: Record<string, number> = {
  corte: 15000,
  barba: 10000,
  combo: 22000,
}

export const CATEGORIAS_INGRESO = ["corte", "barba", "combo"] as const
export const CATEGORIAS_EGRESO = ["suministros", "servicios", "marketing", "otros"] as const
export const METODOS_PAGO = ["efectivo", "transferencia"] as const

export const NAV_DASHBOARD = [
  { label: "Hoy", href: "/dashboard", icon: "CalendarDays" },
  { label: "Citas", href: "/dashboard/citas", icon: "ClipboardList" },
  { label: "Servicios", href: "/dashboard/servicios", icon: "Scissors" },
  { label: "Contabilidad", href: "/dashboard/contabilidad", icon: "Wallet" },
] as const

export function formatoCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
}
