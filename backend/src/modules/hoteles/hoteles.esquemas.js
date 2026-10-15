import { z } from 'zod'
import { camposRangoFechas, validarRangoFechas } from '../reservas/reservas.esquemas.js'

const textoRequerido = (campo, max) =>
  z.string({ error: `${campo} es obligatorio.` }).trim().min(2, `${campo} debe tener al menos 2 caracteres.`).max(max)
const textoOpcional = (max) => z.string().trim().max(max)
const urlImagen = z.url({ protocol: /^https?$/, error: 'La imagen debe ser una URL http(s) válida.' }).max(500)
const precio = z.number({ error: 'El precio debe ser un número.' }).int('El precio debe ser un entero (COP sin decimales).').positive('El precio debe ser mayor que 0.').max(1_000_000_000)
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, 'Identificador inválido.')

export const esquemaParamsHotel = z.strictObject({ id: slug })
export const esquemaParamsHabitacion = z.strictObject({ id: slug, habitacionId: slug })

export const esquemaListarHoteles = z.object({
  destino: z.string().trim().max(100).optional(),
  huespedes: z.coerce.number().int().min(1).max(20).optional(),
})

export const esquemaSimilares = z.object({
  cantidad: z.coerce.number().int().min(1).max(12).default(3),
})

export const esquemaDisponibilidad = z
  .object({
    ...camposRangoFechas,
    huespedes: z.coerce.number().int().min(1).max(20).default(1),
  })
  .superRefine(validarRangoFechas)

export const esquemaCrearHotel = z.strictObject({
  nombre: textoRequerido('El nombre', 120),
  destinoId: slug,
  ubicacion: textoRequerido('La ubicación', 160),
  precioNoche: precio,
  descripcionCorta: textoOpcional(300).default(''),
  descripcion: textoOpcional(5000).default(''),
  imagen: urlImagen.optional(),
})

export const esquemaActualizarHotel = z
  .strictObject({
    nombre: textoRequerido('El nombre', 120),
    destinoId: slug,
    ubicacion: textoRequerido('La ubicación', 160),
    precioNoche: precio,
    descripcionCorta: textoOpcional(300),
    descripcion: textoOpcional(5000),
    imagenes: z.array(urlImagen).min(1, 'Debe haber al menos una imagen.').max(20),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía al menos un campo para actualizar.')

const camposHabitacion = {
  nombre: textoRequerido('El nombre', 120),
  detalle: textoOpcional(300).default(''),
  precio,
  capacidad: z.number({ error: 'La capacidad debe ser un número.' }).int().min(1, 'La capacidad mínima es 1.').max(20, 'La capacidad máxima es 20.'),
  imagen: urlImagen.optional(),
  destacado: z.boolean().default(false),
}

export const esquemaCrearHabitacion = z.strictObject(camposHabitacion)

export const esquemaActualizarHabitacion = z
  .strictObject({
    ...camposHabitacion,
    detalle: textoOpcional(300),
    imagen: urlImagen,
    destacado: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía al menos un campo para actualizar.')
