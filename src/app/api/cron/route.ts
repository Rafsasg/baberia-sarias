import { NextResponse } from "next/server"
import { limpiarPendientesExpiradas } from "@/lib/scheduling"
import { enviarRecordatorio } from "@/lib/whatsapp"
import { createSupabaseAdminClient } from "@/lib/supabase"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const action = new URL(request.url).searchParams.get("action")

  try {
    if (action === "limpiar") {
      const canceladas = await limpiarPendientesExpiradas()
      return NextResponse.json({ ok: true, canceladas: canceladas.length })
    }

    if (action === "recordatorios") {
      const supabase = createSupabaseAdminClient()

      const ahora = new Date()
      const en30Min = new Date(ahora.getTime() + 30 * 60 * 1000)
      const horaTarget = `${String(en30Min.getHours()).padStart(2, "0")}:${String(en30Min.getMinutes()).padStart(2, "0")}`
      const fechaHoy = ahora.toISOString().split("T")[0]

      const { data: citas } = await supabase
        .from("citas")
        .select("*")
        .eq("fecha", fechaHoy)
        .eq("estado", "confirmada")
        .gte("hora_inicio", horaTarget)
        .lt("hora_inicio", `${horaTarget.slice(0, 2)}:${String((parseInt(horaTarget.split(":")[1]) + 1) % 60).padStart(2, "0")}`)

      const enviados: string[] = []
      if (citas) {
        for (const cita of citas) {
          if (cita.cliente_telefono) {
            await enviarRecordatorio(cita.cliente_telefono, {
              cliente: cita.cliente_nombre,
              servicio: cita.servicio,
              hora: cita.hora_inicio,
            })
            enviados.push(cita.id)
          }
        }
      }

      return NextResponse.json({ ok: true, recordatoriosEnviados: enviados.length })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
