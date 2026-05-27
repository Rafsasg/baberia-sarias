import { createSupabaseAdminClient } from "./supabase"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production"

export async function verificarCredenciales(email: string, password: string) {
  const supabase = createSupabaseAdminClient()

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single()

  if (error || !usuario) {
    return { success: false, error: "Credenciales inválidas" }
  }

  const passwordValida = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordValida) {
    return { success: false, error: "Credenciales inválidas" }
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  )

  return {
    success: true,
    token,
    user: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
    },
  }
}

export function verificarToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }
    return { success: true, user: decoded }
  } catch {
    return { success: false, error: "Token inválido o expirado" }
  }
}

export function generarTokenCita(citaId: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(citaId)
    .digest("hex")
    .slice(0, 16)
}

export function verificarTokenCita(citaId: string, token: string): boolean {
  if (!citaId || !token) return false
  const expected = generarTokenCita(citaId)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, "utf8"),
      Buffer.from(expected, "utf8")
    )
  } catch {
    return false
  }
}

