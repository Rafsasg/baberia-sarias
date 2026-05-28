import { NextRequest, NextResponse } from "next/server"
import { obtenerSlots, verificarDisponibilidad, obtenerEstadoBarbero } from "@/lib/scheduling"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get("fecha")
  const horaInicio = searchParams.get("hora_inicio")
  const horaFin = searchParams.get("hora_fin")

  if (!fecha) {
    return NextResponse.json({ error: "Fecha requerida" }, { status: 400 })
  }

  try {
    const barberoEstado = await obtenerEstadoBarbero()

    if (horaInicio && horaFin) {
      if (barberoEstado === "ocupado") {
        return NextResponse.json({ disponible: false, barberoEstado })
      }
      const disponible = await verificarDisponibilidad({
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      })
      return NextResponse.json({ disponible, barberoEstado })
    }

    const slots = await obtenerSlots(fecha)
    return NextResponse.json({ slots, barberoEstado })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    )
  }
}
