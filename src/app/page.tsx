"use client"

import { useState, useEffect, useRef } from "react"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  Scissors,
  Phone,
  MapPin,
  Clock,
  Star,
  ChevronRight,
  Calendar,
  Check,
  Loader2,
  AlertCircle,
  Menu,
  X,
  Sparkles,
  Shield,
  Award,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { HORARIO_INICIO, HORARIO_FIN, formatoCOP } from "@/lib/constants"
import type { TimeSlot, Servicio } from "@/types/database"

const TESTIMONIOS = [
  { nombre: "Carlos M.", texto: "El mejor corte de mi vida. Ambiente relajado y profesional.", estrellas: 5 },
  { nombre: "Andrés G.", texto: "Desde que voy aquí no dejo que nadie más me corte. Recomendado.", estrellas: 5 },
  { nombre: "Luis F.", texto: "La barba queda perfecta siempre. Precios justos y calidad.", estrellas: 5 },
]

const HORARIOS = [
  { dia: "Lunes a Viernes", hora: "9:00 AM - 8:00 PM" },
  { dia: "Sábado", hora: "9:00 AM - 6:00 PM" },
  { dia: "Domingo", hora: "Cerrado" },
]

const BENEFICIOS = [
  { icon: Award, titulo: "Profesionales", desc: "Barberos con años de experiencia" },
  { icon: Shield, titulo: "Higiene", desc: "Esterilización en cada herramienta" },
  { icon: Sparkles, titulo: "Estilo", desc: "Tendencias y cortes modernos" },
]

function generarHorasDelDia() {
  const horas: string[] = []
  const [hIni, mIni] = HORARIO_INICIO.split(":").map(Number)
  const [hFin, mFin] = HORARIO_FIN.split(":").map(Number)
  let m = hIni * 60 + mIni
  const fin = hFin * 60 + mFin
  while (m < fin) {
    const h = Math.floor(m / 60)
    const min = m % 60
    horas.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`)
    m += 30
  }
  return horas
}

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [fecha, setFecha] = useState(addDays(new Date(), 1))
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedHora, setSelectedHora] = useState("")
  const [selectedServicio, setSelectedServicio] = useState("")
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [formData, setFormData] = useState({ nombre: "", telefono: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const serviciosRef = useRef<HTMLDivElement>(null)

  const fechaStr = format(fecha, "yyyy-MM-dd")
  const fechaDisplay = format(fecha, "EEEE d 'de' MMMM", { locale: es })
  const isDomingo = fecha.getDay() === 0

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then((data) => {
        const activos = (data.servicios || []).filter((s: Servicio) => s.activo)
        setServicios(activos)
        if (activos.length > 0) setSelectedServicio(activos[0].slug)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isDomingo) {
      setSlots([])
      return
    }
    async function load() {
      setLoadingSlots(true)
      setSelectedHora("")
      try {
        const res = await fetch(`/api/citas/disponibilidad?fecha=${fechaStr}`)
        const data = await res.json()
        setSlots(data.slots || [])
      } catch {
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    load()
  }, [fechaStr, isDomingo])

  function cambiarFecha(dias: number) {
    const nueva = new Date(fecha)
    nueva.setDate(nueva.getDate() + dias)
    if (nueva <= new Date()) return
    setFecha(nueva)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isDomingo || !selectedHora || !selectedServicio) return

    setSubmitting(true)
    setError("")

    try {
      const [h, m] = selectedHora.split(":").map(Number)
      const mFin = h * 60 + m + 30
      const hFin = Math.floor(mFin / 60)
      const minFin = mFin % 60

      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nombre: formData.nombre,
          cliente_telefono: formData.telefono,
          servicio: selectedServicio,
          fecha: fechaStr,
          hora_inicio: selectedHora,
          hora_fin: `${String(hFin).padStart(2, "0")}:${String(minFin).padStart(2, "0")}`,
          tipo: "web",
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al agendar. Intenta de nuevo.")
        return
      }

      setSubmitted(true)
    } catch {
      setError("Error de conexión. Verifica tu internet.")
    } finally {
      setSubmitting(false)
    }
  }

  const horasDisponibles = slots
    .filter((s) => s.estado === "disponible")
    .map((s) => s.hora_inicio)

  const navLinks = [
    { href: "#servicios", label: "Servicios" },
    { href: "#reserva", label: "Reserva" },
    { href: "#testimonios", label: "Testimonios" },
    { href: "#contacto", label: "Contacto" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M10 2C10 2 10 4 8 6C6 8 4 9 4 11C4 13 6 15 8 15C10 15 12 13 12 11C12 9 10 8 10 6C10 4 10 2 10 2Z" fill="currentColor" opacity="0.3"/>
                <path d="M16 4C16 4 14 6 14 8C14 10 16 12 16 14C16 16 14 17 14 17L16 19C16 19 18 17 18 15C18 13 16 11 16 9C16 7 18 5 18 5L16 4Z" fill="currentColor" opacity="0.5"/>
                <path d="M12 12L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 20L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">
              Sarias
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://wa.me/573182305080"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="group">
                <Phone className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                WhatsApp
              </Button>
            </a>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenu(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden animate-fade-in">
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-end mb-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenu(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-4 text-lg">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenu(false)}
                  className="py-2 text-muted-foreground hover:text-foreground transition-colors border-b border-border/50"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://wa.me/573182305080"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4"
              >
                <Button className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </nav>
          </div>
        </div>
      )}

      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 text-center relative">
          <Badge variant="outline" className="mb-6 text-xs tracking-wider uppercase animate-fade-in">
            Barbería Profesional
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 animate-slide-up">
            Cortes que
            <br />
            <span className="text-primary">hablan por sí solos</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-slide-up [animation-delay:150ms]">
            Estilo, precisión y tradición en cada corte. Agenda tu cita y transforma tu look.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up [animation-delay:300ms]">
            <a href="#reserva">
              <Button size="lg" className="text-base px-8 group">
                Agenda tu cita
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a
              href="https://wa.me/573182305080"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" className="text-base px-8">
                <Phone className="w-5 h-5 mr-2" />
                Escríbenos
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 -mt-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BENEFICIOS.map((b, i) => (
              <div
                key={b.titulo}
                className="flex items-center gap-4 bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{b.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="servicios" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Nuestros Servicios</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Calidad y estilo que marcan la diferencia. Cada servicio está diseñado para que salgas renovado.
            </p>
          </div>

          {servicios.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando servicios...
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6" ref={serviciosRef}>
              {servicios.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedServicio(s.slug)
                    document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className={cn(
                    "group relative p-6 rounded-xl border text-left transition-all duration-500 overflow-hidden",
                    selectedServicio === s.slug
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                  )}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-2xl translate-x-16 -translate-y-16 group-hover:translate-x-8 group-hover:-translate-y-8 transition-all duration-700" />

                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative">
                    <Scissors className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 relative">{s.nombre}</h3>
                  <p className="text-sm text-muted-foreground mb-4 relative">{s.descripcion}</p>

                  {s.incluye && s.incluye.length > 0 && (
                    <div className="mb-4 space-y-1.5 relative">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Incluye:
                      </p>
                      {s.incluye.map((item, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-xs text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between relative">
                    <span className="text-2xl font-bold text-primary">
                      {formatoCOP(s.precio)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {s.duracion} min
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="reserva" className="py-16 md:py-24 bg-gradient-to-b from-accent/50 to-transparent">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Reserva tu Cita</h2>
            <p className="text-muted-foreground">
              Selecciona fecha, hora y servicio. Te confirmaremos por WhatsApp.
            </p>
          </div>

          {submitted ? (
            <div className="max-w-md mx-auto text-center p-8 rounded-xl border border-primary/30 bg-primary/5 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17L4 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">¡Solicitud Enviada!</h3>
              <p className="text-muted-foreground mb-6">
                El barbero revisará tu solicitud y te confirmará por WhatsApp en unos minutos.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false)
                  setSelectedHora("")
                  setFormData({ nombre: "", telefono: "" })
                }}
              >
                Agendar otra cita
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Selecciona un servicio
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {servicios.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedServicio(s.slug)}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-all duration-200",
                          selectedServicio === s.slug
                            ? "border-primary bg-primary/20 text-primary ring-1 ring-primary/30"
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        )}
                      >
                        <div className="text-xs font-medium">{s.nombre}</div>
                        <div className="text-primary font-bold mt-1 text-sm">
                          {formatoCOP(s.precio)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Selecciona una fecha
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => cambiarFecha(-1)}
                      className="shrink-0"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </Button>
                    <div className="flex-1 text-center">
                      <Calendar className="w-4 h-4 inline-block mr-2 text-primary" />
                      <span className="font-medium capitalize">{fechaDisplay}</span>
                      {isDomingo && (
                        <Badge variant="destructive" className="ml-2">
                          Cerrado
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => cambiarFecha(1)}
                      className="shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Selecciona una hora
                  </Label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Cargando horarios...
                    </div>
                  ) : isDomingo ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cerrado los domingos
                    </div>
                  ) : horasDisponibles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay horarios disponibles para este día
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {generarHorasDelDia().map((hora) => {
                        const disponible = horasDisponibles.includes(hora)
                        return (
                          <button
                            key={hora}
                            type="button"
                            disabled={!disponible}
                            onClick={() => setSelectedHora(hora)}
                            className={cn(
                              "py-2 px-1 rounded-lg text-xs font-mono transition-all duration-200 border",
                              selectedHora === hora
                                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                                : disponible
                                  ? "border-border bg-card hover:border-primary/50 hover:bg-accent text-foreground hover:scale-105"
                                  : "border-border bg-muted text-muted-foreground/30 cursor-not-allowed line-through"
                            )}
                          >
                            {hora}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Tu nombre</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Juan Pérez"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">WhatsApp</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      placeholder="+57 300 000 0000"
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Te enviaremos la confirmación aquí
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full text-base group"
                disabled={
                  submitting || isDomingo || !selectedHora || !formData.nombre
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    Solicitar Cita
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Al enviar, el barbero recibirá tu solicitud y te confirmará por WhatsApp.
                Esto no es una reserva automática.
              </p>
            </form>
          )}
        </div>
      </section>

      <section id="testimonios" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-muted-foreground">
              La satisfacción de quienes confían en nosotros
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIOS.map((t, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all duration-300 hover:translate-y-[-4px]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.estrellas }).map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  &ldquo;{t.texto}&rdquo;
                </p>
                <p className="font-semibold text-sm">{t.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="py-16 md:py-24 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-4">Visítanos</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Dirección</p>
                    <p className="text-sm text-muted-foreground">
                      Av. Principal 123, Bogotá
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <a
                      href="https://wa.me/573182305080"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      +57 318 230 5080
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Horarios</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {HORARIOS.map((h) => (
                        <p key={h.dia}>
                          {h.dia}: {h.hora}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl h-64 flex items-center justify-center text-muted-foreground border border-primary/10 relative overflow-hidden group">
              <MapPin className="w-8 h-8 mr-2 z-10" />
              <span className="text-sm z-10">Mapa aquí</span>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M10 2C10 2 10 4 8 6C6 8 4 9 4 11C4 13 6 15 8 15C10 15 12 13 12 11C12 9 10 8 10 6C10 4 10 2 10 2Z" fill="currentColor" opacity="0.3"/>
              <path d="M16 4C16 4 14 6 14 8C14 10 16 12 16 14C16 16 14 17 14 17L16 19C16 19 18 17 18 15C18 13 16 11 16 9C16 7 18 5 18 5L16 4Z" fill="currentColor" opacity="0.5"/>
              <path d="M12 12L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 20L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="font-semibold text-sm">Babería Sarias</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Babería Sarias. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      <a
        href="https://wa.me/573182305080"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-green-500 shadow-lg flex items-center justify-center hover:bg-green-600 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-green-500/30 animate-float"
      >
        <Phone className="w-6 h-6 text-white" />
      </a>
    </div>
  )
}
