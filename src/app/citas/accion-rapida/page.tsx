"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Scissors, CheckCircle, XCircle, Loader2, AlertCircle, Calendar, Clock, User, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function AccionRapidaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [alreadyProcessed, setAlreadyProcessed] = useState(false)
  const [estadoFinal, setEstadoFinal] = useState<"confirmada" | "cancelada" | "">("")
  const [cita, setCita] = useState<any>(null)

  const id = searchParams.get("id")
  const token = searchParams.get("token")
  const accion = searchParams.get("accion") as "confirmada" | "cancelada" | null

  useEffect(() => {
    if (!id || !token || !accion) {
      setError("Faltan parámetros esenciales de seguridad. Por favor verifica el enlace.")
      setLoading(false)
      return
    }

    async function ejecutarAccion() {
      try {
        const res = await fetch("/api/citas/accion-rapida", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, token, accion }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "No se pudo procesar la solicitud.")
        } else {
          setAlreadyProcessed(!!data.alreadyProcessed)
          setEstadoFinal(data.estado)
          setCita(data.cita)
        }
      } catch (err) {
        setError("Error de conexión al servidor.")
      } finally {
        setLoading(false)
      }
    }

    ejecutarAccion()
  }, [id, token, accion])

  const formatServicio = (s: string) => {
    switch (s) {
      case "corte": return "Corte Clásico"
      case "barba": return "Barba Premium"
      case "combo": return "Combo Completo Sarias"
      default: return s
    }
  }

  return (
    <Card className="w-full max-w-lg border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Luz decorativa premium de fondo */}
      <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />

      <CardHeader className="text-center pb-2 relative z-10">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center mb-3 animate-pulse">
          <Scissors className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
          Babería Sarias
        </CardTitle>
        <CardDescription className="text-xs uppercase tracking-widest text-primary/80 font-medium mt-1">
          Agendamiento Inteligente
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Procesando solicitud de agendamiento en tiempo real...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-destructive">Error de Verificación</h3>
            <p className="text-sm text-muted-foreground px-4">{error}</p>
            <Button 
              variant="outline" 
              className="mt-2 w-full border-border/80" 
              onClick={() => router.push("/login")}
            >
              Iniciar Sesión en el Panel
            </Button>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            {/* Cabecera del Estado */}
            <div className="space-y-2">
              {estadoFinal === "confirmada" ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-2 scale-up-animation">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-green-400">
                    {alreadyProcessed ? "Cita Ya Confirmada" : "¡Cita Confirmada!"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {alreadyProcessed 
                      ? "Esta solicitud ya fue confirmada previamente. El cliente ya cuenta con su espacio reservado." 
                      : "El agendamiento ha sido aprobado. Se ha enviado un mensaje automático de confirmación al WhatsApp del cliente."}
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2 scale-up-animation">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-destructive">
                    {alreadyProcessed ? "Cita Ya Rechazada" : "Cita Rechazada"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {alreadyProcessed 
                      ? "Esta cita ya fue cancelada/rechazada previamente. El slot está disponible en el calendario." 
                      : "La solicitud de cita fue cancelada. Se notificó al cliente de forma educada para que elija otro horario."}
                  </p>
                </>
              )}
            </div>

            {/* Detalles de la cita */}
            {cita && (
              <div className="bg-muted/40 border border-border/40 rounded-xl p-4 text-left space-y-3 mx-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-border/30 pb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Detalles del Agendamiento
                </h4>
                <div className="grid grid-cols-1 gap-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{cita.cliente_nombre}</span>
                    {cita.cliente_telefono && (
                      <span className="text-xs font-mono bg-accent/40 text-muted-foreground px-1.5 py-0.5 rounded">
                        {cita.cliente_telefono}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scissors className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">Servicio: </span>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary-foreground bg-primary/5">
                      {formatServicio(cita.servicio)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">Fecha: </span>
                    <span className="font-mono text-xs">{cita.fecha}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">Horario: </span>
                    <span className="font-mono font-medium text-xs text-primary">{cita.hora_inicio} - {cita.hora_fin}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button 
                onClick={() => router.push("/dashboard")} 
                className="w-full text-sm font-semibold tracking-wide"
              >
                Ir al Panel del Barbero
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => router.push("/")} 
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Ir a la Landing Page Pública
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AccionRapidaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Fondo premium con gradiente */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(196,154,60,0.12),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent)]" />
      
      <Suspense fallback={
        <Card className="w-full max-w-lg border border-border/60 bg-card/90 backdrop-blur-xl p-8 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando verificación...</p>
        </Card>
      }>
        <AccionRapidaContent />
      </Suspense>
    </div>
  )
}
