import { NextRequest, NextResponse } from "next/server"
import { verificarCredenciales } from "@/lib/auth"

const intentos = new Map<string, { count: number; resetAt: number }>()
const MAX_INTENTOS = 5
const VENTANA_MINUTOS = 1

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown"

  const ahora = Date.now()
  const registro = intentos.get(ip)

  if (registro && registro.count >= MAX_INTENTOS && registro.resetAt > ahora) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 1 minuto." },
      { status: 429 }
    )
  }

  if (registro && registro.resetAt < ahora) {
    intentos.delete(ip)
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 }
      )
    }

    const result = await verificarCredenciales(email, password)

    if (!result.success) {
      const existing = intentos.get(ip) || { count: 0, resetAt: ahora + VENTANA_MINUTOS * 60 * 1000 }
      existing.count += 1
      intentos.set(ip, existing)

      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    intentos.delete(ip)

    const response = NextResponse.json({ success: true, user: result.user })

    response.cookies.set("session", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
