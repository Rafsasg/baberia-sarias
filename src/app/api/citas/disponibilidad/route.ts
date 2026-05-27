import { NextRequest, NextResponse } from "next/server"
import { obtenerSlots, verificarDisponibilidad } from "@/lib/scheduling"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get("fecha")
  const horaInicio = searchParams.get("hora_inicio")
  const horaFin = searchParams.get("hora_fin")

  if (!fecha) {
    return NextResponse.json({ error: "Fecha requerida" }, { status: 400 })
  }

  try {
    if (horaInicio && horaFin) {
      const disponible = await verificarDisponibilidad({
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      })
      return NextResponse.json({ disponible })
    }

    const slots = await obtenerSlots(fecha)
    return NextResponse.json({ slots })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    )
  }
}
