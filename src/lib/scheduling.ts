import { createSupabaseAdminClient } from "./supabase"
import type { TimeSlot, Cita } from "@/types/database"
import { HORARIO_INICIO, HORARIO_FIN, DURACION_SLOT, TIEMPO_CONFIRMACION_MIN, PRECIOS } from "./constants"

const cachePrecios = new Map<string, number>()

async function obtenerPrecio(servicioSlug: string): Promise<number> {
  if (cachePrecios.has(servicioSlug)) {
    return cachePrecios.get(servicioSlug)!
  }
  try {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from("servicios")
      .select("precio")
      .eq("slug", servicioSlug)
      .eq("activo", true)
      .single()
    if (data?.precio) {
      cachePrecios.set(servicioSlug, data.precio)
      return data.precio
    }
  } catch {
    // fallback a constantes
  }
  return PRECIOS[servicioSlug] || 0
}

interface SlotParams {
  fecha: string
  hora_inicio: string
  hora_fin: string
}

export async function verificarDisponibilidad(params: SlotParams): Promise<boolean> {
  await limpiarPendientesExpiradas().catch(err => console.error("Error auto-limpiando citas:", err))
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from("citas")
    .select("id", { count: "exact", head: true })
    .eq("fecha", params.fecha)
    .lt("hora_inicio", params.hora_fin)
    .gt("hora_fin", params.hora_inicio)
    .in("estado", ["pendiente", "confirmada"])

  if (error) throw new Error(`Error verificando disponibilidad: ${error.message}`)

  return data === null || data.length === 0
}

export async function obtenerSlots(fecha: string): Promise<TimeSlot[]> {
  await limpiarPendientesExpiradas().catch(err => console.error("Error auto-limpiando citas:", err))
  const supabase = createSupabaseAdminClient()

  const { data: citas, error } = await supabase
    .from("citas")
    .select("*")
    .eq("fecha", fecha)
    .in("estado", ["pendiente", "confirmada"])
    .order("hora_inicio", { ascending: true })

  if (error) throw new Error(`Error obteniendo slots: ${error.message}`)

  const slots: TimeSlot[] = []
  const [horaIniH, horaIniM] = HORARIO_INICIO.split(":").map(Number)
  const [horaFinH, horaFinM] = HORARIO_FIN.split(":").map(Number)
  const inicioMinutos = horaIniH * 60 + horaIniM
  const finMinutos = horaFinH * 60 + horaFinM

  for (let m = inicioMinutos; m < finMinutos; m += DURACION_SLOT) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const hFin = Math.floor((m + DURACION_SLOT) / 60)
    const minFin = (m + DURACION_SLOT) % 60

    const inicio = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    const fin = `${String(hFin).padStart(2, "0")}:${String(minFin).padStart(2, "0")}`

    const citaColision = citas?.find((c: Cita) => {
      return c.hora_inicio < fin && c.hora_fin > inicio
    })

    if (citaColision) {
      slots.push({
        hora_inicio: inicio,
        hora_fin: fin,
        estado: citaColision.estado === "pendiente" ? "pendiente" : "confirmada",
        cita: citaColision,
      })
    } else {
      slots.push({
        hora_inicio: inicio,
        hora_fin: fin,
        estado: "disponible",
      })
    }
  }

  return slots
}

export async function crearCitaWeb(datos: {
  cliente_nombre: string
  cliente_telefono: string
  servicio: string
  fecha: string
  hora_inicio: string
  hora_fin: string
}) {
  const disponible = await verificarDisponibilidad({
    fecha: datos.fecha,
    hora_inicio: datos.hora_inicio,
    hora_fin: datos.hora_fin,
  })

  if (!disponible) {
    return { success: false, error: "Slot no disponible" }
  }

  const supabase = createSupabaseAdminClient()

  const expiresAt = new Date(Date.now() + TIEMPO_CONFIRMACION_MIN * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("citas")
    .insert({
      cliente_nombre: datos.cliente_nombre,
      cliente_telefono: datos.cliente_telefono,
      servicio: datos.servicio,
      fecha: datos.fecha,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
      estado: "pendiente",
      tipo: "web",
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  return { success: true, data }
}

export async function crearWalkIn(datos: {
  cliente_nombre: string
  servicio: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  metodo_pago?: "efectivo" | "transferencia"
}) {
  const supabase = createSupabaseAdminClient()

  // 1. Verificar si hay alguna cita CONFIRMADA en este slot para evitar sobreescritura/doble reserva
  const { data: citasExistentes, error: checkError } = await supabase
    .from("citas")
    .select("id")
    .eq("fecha", datos.fecha)
    .lt("hora_inicio", datos.hora_fin)
    .gt("hora_fin", datos.hora_inicio)
    .eq("estado", "confirmada")
    .limit(1)

  if (checkError) return { success: false, error: checkError.message }
  if (citasExistentes && citasExistentes.length > 0) {
    return { success: false, error: "El slot ya está ocupado por una cita confirmada" }
  }

  // 2. Insertar la cita presencial/confirmada del walk-in
  const { data: cita, error: citaError } = await supabase
    .from("citas")
    .insert({
      cliente_nombre: datos.cliente_nombre,
      servicio: datos.servicio,
      fecha: datos.fecha,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
      estado: "confirmada",
      tipo: "presencial",
    })
    .select()
    .single()

  if (citaError) return { success: false, error: citaError.message }

  // 3. Cancelar de forma concurrente cualquier cita web PENDIENTE en el mismo slot
  const { data: citasCanceladas } = await supabase
    .from("citas")
    .update({ estado: "cancelada", expires_at: null })
    .eq("fecha", datos.fecha)
    .lt("hora_inicio", datos.hora_fin)
    .gt("hora_fin", datos.hora_inicio)
    .eq("estado", "pendiente")
    .neq("id", cita.id)
    .select()

  // 4. Registrar automáticamente la transacción en contabilidad
  const monto = await obtenerPrecio(datos.servicio)
  const { error: transError } = await supabase
    .from("transacciones")
    .insert({
      tipo: "ingreso",
      monto,
      categoria: datos.servicio,
      metodo_pago: datos.metodo_pago || "efectivo",
      descripcion: `Walk-in: ${datos.cliente_nombre}`,
      fecha_creacion: datos.fecha,
      cita_id: cita.id,
    })

  if (transError) {
    console.error("Error registrando transacción automática:", transError)
  }

  return { success: true, data: cita, citasCanceladas }
}

export async function limpiarPendientesExpiradas() {
  const supabase = createSupabaseAdminClient()

  const ahora = new Date().toISOString()

  const { data, error } = await supabase
    .from("citas")
    .update({ estado: "cancelada" })
    .eq("estado", "pendiente")
    .lt("expires_at", ahora)
    .select()

  if (error) throw new Error(`Error limpiando expirados: ${error.message}`)

  return data || []
}

export async function getCitasDelDia(fecha: string) {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from("citas")
    .select("*")
    .eq("fecha", fecha)
    .in("estado", ["pendiente", "confirmada"])
    .order("hora_inicio", { ascending: true })

  if (error) throw new Error(`Error obteniendo citas: ${error.message}`)

  return data as Cita[]
}

export async function actualizarEstadoCita(id: string, estado: "confirmada" | "cancelada") {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from("citas")
    .update({ estado, expires_at: null })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Si se confirma, registrar automáticamente la transacción en contabilidad
  if (estado === "confirmada") {
    const { data: transExistente } = await supabase
      .from("transacciones")
      .select("id")
      .eq("cita_id", id)
      .limit(1)

    if (!transExistente || transExistente.length === 0) {
      const monto = await obtenerPrecio(data.servicio)
      await supabase.from("transacciones").insert({
        tipo: "ingreso",
        monto,
        categoria: data.servicio,
        metodo_pago: "efectivo", // por defecto efectivo, editable
        descripcion: `Web: ${data.cliente_nombre}`,
        fecha_creacion: data.fecha,
        cita_id: id,
      })
    }
  } else if (estado === "cancelada") {
    // Si se cancela la cita, eliminar automáticamente la transacción vinculada
    await supabase
      .from("transacciones")
      .delete()
      .eq("cita_id", id)
  }

  return { success: true, data }
}

