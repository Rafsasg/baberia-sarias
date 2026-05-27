import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const result = verificarToken(token)

  if (!result.success) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user: result.user })
}
