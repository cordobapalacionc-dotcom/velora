import { z } from 'zod'
import { calcularNoches, hoyISO } from '../../utils/fechas.js'

export const MAX_NOCHES = 30
export const MAX_DIAS_ANTICIPACION = 365
export const ESTADOS_RESERVA = ['confirmada', 'check-in', 'check-out', 'cancelada']

const fecha = (campo) => z.iso.date(`${campo} debe tener el formato AAAA-MM-DD.`)
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, 'Identificador inválido.')

export const camposRangoFechas = {
  entrada: fecha('La fecha de llegada'),
  salida: fecha('La fecha de salida'),
}

/** Reglas comunes a cualquier rango de estadía. Se usa con .superRefine(). */
export function validarRangoFechas({ entrada, salida }, ctx) {
  const hoy = hoyISO()
  if (entrada < hoy) {
    ctx.addIssue({ code: 'custom', path: ['entrada'], message: 'La fecha de llegada no puede estar en el pasado.' })
  }
  if (calcularNoches(hoy, entrada) > MAX_DIAS_ANTICIPACION) {
    ctx.addIssue({ code: 'custom', path: ['entrada'], message: `Solo se puede reservar con hasta ${MAX_DIAS_ANTICIPACION} días de anticipación.` })
  }
  if (salida <= entrada) {
    ctx.addIssue({ code: 'custom', path: ['salida'], message: 'La fecha de salida debe ser posterior a la de llegada.' })
  } else if (calcularNoches(entrada, salida) > MAX_NOCHES) {
    ctx.addIssue({ code: 'custom', path: ['salida'], message: `La estadía máxima es de ${MAX_NOCHES} noches.` })
  }
}

export const esquemaCrearReserva = z
  .strictObject({
    hotelId: slug,
    habitacionId: slug,
    ...camposRangoFechas,
    huespedes: z.number({ error: 'La cantidad de huéspedes debe ser un número.' }).int().min(1).max(20),
  })
  .superRefine(validarRangoFechas)

export const esquemaParamsReserva = z.strictObject({ id: z.uuid('Id de reserva inválido.') })

export const esquemaListarReservas = z.object({
  q: z.string().trim().max(100).optional(),
  estado: z.enum(ESTADOS_RESERVA).optional(),
  hotelId: slug.optional(),
})
