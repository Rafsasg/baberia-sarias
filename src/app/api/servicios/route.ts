import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase"
import { verificarToken } from "@/lib/auth"

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .order("precio", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ servicios: data })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

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

export async function POST(request: NextRequest) {
  const authError = verificarAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()

    if (!body.slug || !body.nombre || !body.precio) {
      return NextResponse.json(
        { error: "slug, nombre y precio son requeridos" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("servicios")
      .insert({
        slug: body.slug,
        nombre: body.nombre,
        descripcion: body.descripcion || "",
        precio: body.precio,
        duracion: body.duracion || 30,
        incluye: body.incluye || [],
        activo: body.activo ?? true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe un servicio con ese slug" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ servicio: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
