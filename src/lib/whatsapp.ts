import { generarTokenCita } from "./auth"

const API_URL = process.env.WHATSAPP_API_URL
const API_TOKEN = process.env.WHATSAPP_API_TOKEN
const BARBER_WA = (process.env.BARBER_WHATSAPP || "") + "@c.us"

async function sendRequest(method: string, payload: unknown) {
  if (!API_URL || !API_TOKEN) {
    console.warn("WhatsApp no configurado. SKIP.")
    return null
  }

  try {
    const res = await fetch(`${API_URL}/waInstance${API_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (err) {
    console.error("WhatsApp error:", err)
    return null
  }
}

export async function enviarNotificacionCita(datos: {
  citaId: string
  cliente: string
  servicio: string
  fecha: string
  hora: string
}) {
  const token = generarTokenCita(datos.citaId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  const linkAprobar = `${appUrl}/citas/accion-rapida?id=${datos.citaId}&token=${token}&accion=confirmada`
  const linkRechazar = `${appUrl}/citas/accion-rapida?id=${datos.citaId}&token=${token}&accion=cancelada`

  const mensaje = `🧔 *Nueva Solicitud de Cita*\n\n` +
    `👤 Cliente: *${datos.cliente}*\n` +
    `✂️ Servicio: *${datos.servicio.toUpperCase()}*\n` +
    `📅 Fecha: *${datos.fecha}*\n` +
    `⏰ Hora: *${datos.hora}*\n\n` +
    `🟢 *Aprobar al instante:*\n${linkAprobar}\n\n` +
    `🔴 *Rechazar al instante:*\n${linkRechazar}\n\n` +
    `O responde directamente con *APROBAR* o *RECHAZAR*\n\n` +
    `_(Ref: cita-${datos.citaId})_`

  return sendRequest("sendMessage", {
    chatId: BARBER_WA,
    message: mensaje,
  })
}


export async function enviarConfirmacionCliente(telefono: string, datos: {
  cliente: string
  servicio: string
  fecha: string
  hora: string
}) {
  const chatId = telefono.includes("@c.us") ? telefono : `${telefono}@c.us`

  const mensaje = `✅ *Cita Confirmada*\n\nHola ${datos.cliente}, tu cita ha sido *confirmada* ✅\n\n✂️ ${datos.servicio}\n📅 ${datos.fecha}\n⏰ ${datos.hora}\n\nTe esperamos! 🏪`

  return sendRequest("sendMessage", {
    chatId,
    message: mensaje,
  })
}

export async function enviarRechazoCliente(telefono: string, datos: {
  cliente: string
  fecha: string
  hora: string
}) {
  const chatId = telefono.includes("@c.us") ? telefono : `${telefono}@c.us`

  const mensaje = `😕 *Cita No Confirmada*\n\nHola ${datos.cliente}, lamentablemente el horario de las ${datos.hora} del ${datos.fecha} no está disponible.\n\nPor favor intenta con otro horario. 🏪`

  return sendRequest("sendMessage", {
    chatId,
    message: mensaje,
  })
}

export async function enviarRecordatorio(telefono: string, datos: {
  cliente: string
  servicio: string
  hora: string
}) {
  const chatId = telefono.includes("@c.us") ? telefono : `${telefono}@c.us`

  const mensaje = `⏰ *Recordatorio de Cita*\n\nHola ${datos.cliente}, te recordamos que tienes una cita en **30 minutos** ⏳\n\n✂️ ${datos.servicio}\n⏰ ${datos.hora}\n\nTe esperamos! 🏪`

  return sendRequest("sendMessage", {
    chatId,
    message: mensaje,
  })
}
