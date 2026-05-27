import { NextRequest, NextResponse } from "next/server"
import { actualizarEstadoCita } from "@/lib/scheduling"
import { enviarConfirmacionCliente, enviarRechazoCliente } from "@/lib/whatsapp"
import { createSupabaseAdminClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.typeMessage === "textMessage" && body.textMessageData) {
      const texto = body.textMessageData.textMessage || ""
      const chatId = body.senderData?.chatId || ""

      const matchCita = texto.match(/cita-\w+/)
      if (!matchCita) {
        return NextResponse.json({ ok: true })
      }

      const citaId = matchCita[0].replace("cita-", "")

      if (texto.toUpperCase().includes("APROBAR")) {
        const result = await actualizarEstadoCita(citaId, "confirmada")
        if (result.success && result.data) {
          const c = result.data
          if (c.cliente_telefono) {
            await enviarConfirmacionCliente(c.cliente_telefono, {
              cliente: c.cliente_nombre,
              servicio: c.servicio,
              fecha: c.fecha,
              hora: c.hora_inicio,
            })
          }
        }
      } else if (texto.toUpperCase().includes("RECHAZAR")) {
        const result = await actualizarEstadoCita(citaId, "cancelada")
        if (result.success && result.data) {
          const c = result.data
          if (c.cliente_telefono) {
            await enviarRechazoCliente(c.cliente_telefono, {
              cliente: c.cliente_nombre,
              fecha: c.fecha,
              hora: c.hora_inicio,
            })
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
