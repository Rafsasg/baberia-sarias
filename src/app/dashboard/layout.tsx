"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  Scissors,
  CalendarDays,
  ClipboardList,
  Wallet,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const navItems = [
  { label: "Hoy", href: "/dashboard", icon: CalendarDays },
  { label: "Citas", href: "/dashboard/citas", icon: ClipboardList },
  { label: "Servicios", href: "/dashboard/servicios", icon: Scissors },
  { label: "Contabilidad", href: "/dashboard/contabilidad", icon: Wallet },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState("Barbero")
  const [barberoEstado, setBarberoEstado] = useState<"disponible" | "ocupado">("disponible")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function checkAuth() {
      try {
        const [meRes, estadoRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/auth/barbero-estado"),
        ])
        if (!meRes.ok) {
          router.push("/login")
          return
        }
        const meData = await meRes.json()
        if (meData.user) {
          setUserName(meData.user.email?.split("@")[0] || "Barbero")
        }
        if (estadoRes.ok) {
          const estadoData = await estadoRes.json()
          if (!cancelled) setBarberoEstado(estadoData.estado)
        }
      } catch {
        router.push("/login")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    checkAuth()

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/barbero-estado")
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setBarberoEstado(data.estado)
        }
      } catch {}
    }, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [router])

  async function toggleEstado() {
    const prev = barberoEstado
    const nuevoEstado = prev === "disponible" ? "ocupado" : "disponible"
    setBarberoEstado(nuevoEstado)
    try {
      const res = await fetch("/api/auth/barbero-estado", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Error al cambiar estado:", res.status, err)
        setBarberoEstado(prev)
      }
    } catch (e) {
      console.error("Error de red al cambiar estado:", e)
      setBarberoEstado(prev)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">
          <Scissors className="w-12 h-12" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Babería Sarias</h2>
                <p className="text-xs text-muted-foreground">Panel</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start gap-2",
                barberoEstado === "disponible"
                  ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
              )}
              onClick={toggleEstado}
            >
              {barberoEstado === "disponible" ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {barberoEstado === "disponible" ? "Disponible" : "Ocupado"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 h-14">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
            <div className="flex-1" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
