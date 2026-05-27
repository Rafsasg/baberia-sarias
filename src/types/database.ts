export type CitaEstado = "pendiente" | "confirmada" | "cancelada"
export type CitaTipo = "web" | "presencial"
export type Servicio = "corte" | "barba" | "combo"
export type MetodoPago = "efectivo" | "transferencia"
export type TransaccionTipo = "ingreso" | "egreso"
export type CategoriaEgreso = "suministros" | "servicios" | "marketing" | "otros"

export interface Cita {
  id: string
  cliente_nombre: string
  cliente_telefono: string | null
  servicio: Servicio
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: CitaEstado
  tipo: CitaTipo
  created_at: string
  expires_at: string | null
}

export interface Transaccion {
  id: string
  tipo: TransaccionTipo
  monto: number
  categoria: string
  metodo_pago: MetodoPago | null
  descripcion: string | null
  fecha_creacion: string
  cita_id: string | null
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  telefono: string | null
  created_at: string
}

export interface Servicio {
  id: string
  slug: string
  nombre: string
  descripcion: string
  precio: number
  duracion: number
  incluye: string[]
  activo: boolean
  created_at: string
  updated_at: string
}

export interface TimeSlot {
  hora_inicio: string
  hora_fin: string
  estado: "disponible" | "pendiente" | "confirmada" | "ocupado"
  cita?: Cita
}
