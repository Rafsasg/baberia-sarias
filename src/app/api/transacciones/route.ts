import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const tipo = searchParams.get("tipo")
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("transacciones")
    .select("*", { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (desde) query = query.gte("fecha_creacion", desde)
  if (hasta) query = query.lte("fecha_creacion", hasta)
  if (tipo) query = query.eq("tipo", tipo)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.tipo || !body.monto || !body.categoria) {
    return NextResponse.json(
      { error: "tipo, monto y categoria requeridos" },
      { status: 400 }
    )
  }

  if (body.tipo === "ingreso" && !body.metodo_pago) {
    return NextResponse.json(
      { error: "metodo_pago requerido para ingresos" },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from("transacciones")
    .insert({
      tipo: body.tipo,
      monto: body.monto,
      categoria: body.categoria,
      metodo_pago: body.metodo_pago || null,
      descripcion: body.descripcion || null,
      fecha_creacion: body.fecha_creacion || new Date().toISOString().split("T")[0],
      cita_id: body.cita_id || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  const updates: Record<string, unknown> = {}
  if (body.monto !== undefined) updates.monto = body.monto
  if (body.categoria !== undefined) updates.categoria = body.categoria
  if (body.metodo_pago !== undefined) updates.metodo_pago = body.metodo_pago
  if (body.descripcion !== undefined) updates.descripcion = body.descripcion
  if (body.fecha_creacion !== undefined) updates.fecha_creacion = body.fecha_creacion

  const { data, error } = await supabase
    .from("transacciones")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from("transacciones").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
