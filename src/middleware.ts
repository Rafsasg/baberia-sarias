import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard")
  const isLoginRoute = request.nextUrl.pathname === "/login"
  const isApiDashboard = request.nextUrl.pathname.startsWith("/api/")

  if (isDashboardRoute && !token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoginRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (isApiDashboard && request.nextUrl.pathname.startsWith("/api/transacciones")) {
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/transacciones/:path*"],
}
