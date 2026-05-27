import { NextRequest, NextResponse } from "next/server"
import { verificarTokenCita } from "@/lib/auth"
import { actualizarEstadoCita } from "@/lib/scheduling"
import { enviarConfirmacionCliente, enviarRechazoCliente } from "@/lib/whatsapp"
import { createSupabaseAdminClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, token, accion } = body as { id: string; token: string; accion: "confirmada" | "cancelada" }

    if (!id || !token || !accion) {
      return NextResponse.json({ error: "Parámetros faltantes" }, { status: 400 })
    }

    if (!["confirmada", "cancelada"].includes(accion)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }

    // 1. Validar firma criptográfica del token
    const tokenValido = verificarTokenCita(id, token)
    if (!tokenValido) {
      return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 403 })
    }

    // 2. Obtener la cita actual para verificar si ya fue procesada o expiró
    const supabase = createSupabaseAdminClient()
    const { data: cita, error: fetchError } = await supabase
      .from("citas")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !cita) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 })
    }

    // Si la cita ya no está pendiente, informar su estado procesado
    if (cita.estado !== "pendiente") {
      return NextResponse.json({ 
        success: true, 
        alreadyProcessed: true, 
        estado: cita.estado,
        cita 
      })
    }

    // 3. Ejecutar la acción
    const result = await actualizarEstadoCita(id, accion)
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || "No se pudo actualizar el estado de la cita" }, { status: 500 })
    }

    const citaActualizada = result.data

    // 4. Notificar al cliente web por WhatsApp en tiempo real
    if (citaActualizada.cliente_telefono && citaActualizada.tipo === "web") {
      if (accion === "confirmada") {
        await enviarConfirmacionCliente(citaActualizada.cliente_telefono, {
          cliente: citaActualizada.cliente_nombre,
          servicio: citaActualizada.servicio,
          fecha: citaActualizada.fecha,
          hora: citaActualizada.hora_inicio,
        }).catch(err => console.error("Error al enviar confirmación de WhatsApp:", err))
      } else {
        await enviarRechazoCliente(citaActualizada.cliente_telefono, {
          cliente: citaActualizada.cliente_nombre,
          fecha: citaActualizada.fecha,
          hora: citaActualizada.hora_inicio,
        }).catch(err => console.error("Error al enviar rechazo de WhatsApp:", err))
      }
    }

    return NextResponse.json({ 
      success: true, 
      alreadyProcessed: false, 
      estado: accion, 
      cita: citaActualizada 
    })
  } catch (error) {
    console.error("Error en endpoint de acción rápida:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
