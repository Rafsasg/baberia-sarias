import { NextRequest, NextResponse } from "next/server"
import { crearCitaWeb, crearWalkIn, getCitasDelDia } from "@/lib/scheduling"
import { enviarNotificacionCita, enviarRechazoCliente } from "@/lib/whatsapp"
import { verificarToken } from "@/lib/auth"
import { PRECIOS } from "@/lib/constants"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get("fecha") || new Date().toISOString().split("T")[0]

  try {
    const citas = await getCitasDelDia(fecha)
    return NextResponse.json({ citas })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session")?.value

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await request.json()

    if (body.tipo === "presencial") {
      if (!token) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
      }

      const auth = verificarToken(token)
      if (!auth.success) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
      }

      const result = await crearWalkIn({
        cliente_nombre: body.cliente_nombre,
        servicio: body.servicio,
        fecha: body.fecha,
        hora_inicio: body.hora_inicio,
        hora_fin: body.hora_fin,
        metodo_pago: body.metodo_pago,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 409 })
      }

      // Notificar automáticamente por WhatsApp a los clientes cuyas citas pendientes fueron canceladas por colisión
      if (result.citasCanceladas && result.citasCanceladas.length > 0) {
        for (const cita of result.citasCanceladas) {
          if (cita.cliente_telefono) {
            enviarRechazoCliente(cita.cliente_telefono, {
              cliente: cita.cliente_nombre,
              fecha: cita.fecha,
              hora: cita.hora_inicio,
            }).catch((err) => console.error("Error enviando rechazo de cita cancelada por colisión:", err))
          }
        }
      }

      return NextResponse.json(result.data)
    }

    const result = await crearCitaWeb({
      cliente_nombre: body.cliente_nombre,
      cliente_telefono: body.cliente_telefono,
      servicio: body.servicio,
      fecha: body.fecha,
      hora_inicio: body.hora_inicio,
      hora_fin: body.hora_fin,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    if (result.data) {
      await enviarNotificacionCita({
        citaId: result.data.id,
        cliente: result.data.cliente_nombre,
        servicio: result.data.servicio,
        fecha: result.data.fecha,
        hora: result.data.hora_inicio,
      })
    }

    return NextResponse.json(result.data)
  }

  return NextResponse.json({ error: "Content-Type no soportado" }, { status: 400 })
}
