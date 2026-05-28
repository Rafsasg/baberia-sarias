import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase"
import { verificarToken } from "@/lib/auth"

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("usuarios")
      .select("estado")
      .eq("email", "barbero@baberiasarias.com")
      .single()

    if (error || !data) {
      return NextResponse.json({ estado: "disponible" })
    }

    return NextResponse.json({ estado: data.estado })
  } catch (error) {
    console.error("Error obteniendo estado del barbero:", error)
    return NextResponse.json({ estado: "disponible" })
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get("session")?.value
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const auth = verificarToken(token)
  if (!auth.success) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { estado } = await request.json()

    if (estado !== "disponible" && estado !== "ocupado") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("usuarios")
      .update({ estado })
      .eq("email", "barbero@baberiasarias.com")
      .select("estado")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ estado: data.estado })
  } catch (error) {
    console.error("Error actualizando estado del barbero:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
