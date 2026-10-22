import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import { config } from '../../config/env.js'

let transporte = null

// En las pruebas los correos no salen a ningún lado: quedan aquí para poder revisarlos.
export const buzonDePruebas = []

const escaparHtml = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Plantilla común: título, párrafos y, si hay, un botón con enlace. Todo el texto se escapa. */
function plantilla({ titulo, parrafos, boton }) {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${escaparHtml(p)}</p>`).join('')
  const enlace = boton
    ? `<p style="margin:24px 0"><a href="${escaparHtml(boton.url)}" style="background:#a9772a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:4px;display:inline-block">${escaparHtml(boton.texto)}</a></p>`
    : ''
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f3ee;font-family:Georgia,serif;color:#2b2722">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="letter-spacing:4px;font-size:18px;margin:0 0 24px">VELORA</p>
<h1 style="font-size:22px;font-weight:normal;margin:0 0 18px">${escaparHtml(titulo)}</h1>
${cuerpo}${enlace}
<p style="font-size:12px;color:#6b645a;margin-top:32px">Este es un mensaje automático de Velora. No respondas a este correo.</p>
</div></body></html>`
}

function textoPlano({ titulo, parrafos, boton }) {
  return [titulo, '', ...parrafos, ...(boton ? ['', `${boton.texto}: ${boton.url}`] : [])].join('\n')
}

/**
 * Envía un correo. Con SMTP configurado sale por ese servidor; sin él (desarrollo) se guarda como
 * archivo .html en data/correos para poder abrirlo en el navegador.
 */
export async function enviarCorreo({ para, asunto, titulo, parrafos, boton }) {
  const mensaje = { para, asunto, html: plantilla({ titulo, parrafos, boton }), texto: textoPlano({ titulo, parrafos, boton }) }

  if (config.entorno === 'test') {
    buzonDePruebas.push(mensaje)
    return
  }

  if (config.correo.smtp) {
    transporte ??= nodemailer.createTransport(config.correo.smtp)
    await transporte.sendMail({ from: config.correo.remitente, to: para, subject: asunto, text: mensaje.texto, html: mensaje.html })
    return
  }

  mkdirSync(config.correo.carpeta, { recursive: true })
  const nombre = `${new Date().toISOString().replace(/[:.]/g, '-')}-${para.replace(/[^a-z0-9]+/gi, '_')}.html`
  const cabecera = `<!-- Para: ${escaparHtml(para)} · Asunto: ${escaparHtml(asunto)} -->\n`
  await writeFile(join(config.correo.carpeta, nombre), cabecera + mensaje.html)
  console.log(`[correo] "${asunto}" para ${para} → guardado en ${join(config.correo.carpeta, nombre)}`)
}

/** Para avisos que no deben frenar la operación principal: si el correo falla, solo se registra. */
export function enviarCorreoSinEsperar(datos) {
  enviarCorreo(datos).catch((error) => console.error(`[correo] No se pudo enviar "${datos.asunto}":`, error.message))
}
