import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase"
import { verificarToken } from "@/lib/auth"

function verificarAuth(request: NextRequest) {
  const token = request.cookies.get("session")?.value
  if (!token) {
    return { error: "No autorizado", status: 401 }
  }
  const auth = verificarToken(token)
  if (!auth.success) {
    return { error: "No autorizado", status: 401 }
  }
  return null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verificarAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const supabase = createSupabaseAdminClient()

    const updateData: Record<string, unknown> = {}
    if (body.nombre !== undefined) updateData.nombre = body.nombre
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion
    if (body.precio !== undefined) updateData.precio = body.precio
    if (body.duracion !== undefined) updateData.duracion = body.duracion
    if (body.incluye !== undefined) updateData.incluye = body.incluye
    if (body.activo !== undefined) updateData.activo = body.activo
    if (body.slug !== undefined) updateData.slug = body.slug
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("servicios")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe otro servicio con ese slug" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ servicio: data })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verificarAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const { id } = await params
    const supabase = createSupabaseAdminClient()

    const { error } = await supabase
      .from("servicios")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
