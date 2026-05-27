import { NextRequest, NextResponse } from "next/server"
import { actualizarEstadoCita } from "@/lib/scheduling"
import { enviarConfirmacionCliente, enviarRechazoCliente } from "@/lib/whatsapp"
import { verificarToken } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("session")?.value
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const auth = verificarToken(token)
  if (!auth.success) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { estado } = body as { estado: "confirmada" | "cancelada" }

  if (!estado || !["confirmada", "cancelada"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  }

  const result = await actualizarEstadoCita(id, estado)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  if (result.data) {
    const cita = result.data
    if (cita.tipo === "web" && cita.cliente_telefono) {
      if (estado === "confirmada") {
        await enviarConfirmacionCliente(cita.cliente_telefono, {
          cliente: cita.cliente_nombre,
          servicio: cita.servicio,
          fecha: cita.fecha,
          hora: cita.hora_inicio,
        })
      } else {
        await enviarRechazoCliente(cita.cliente_telefono, {
          cliente: cita.cliente_nombre,
          fecha: cita.fecha,
          hora: cita.hora_inicio,
        })
      }
    }
  }

  return NextResponse.json(result.data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("session")?.value
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const auth = verificarToken(token)
  if (!auth.success) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from("citas")
    .update({ estado: "cancelada" })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
