import { z } from 'zod'

const puntaje = (campo) =>
  z.number({ error: `${campo} debe ser un número del 1 al 5.` }).int().min(1, `${campo} va de 1 a 5.`).max(5, `${campo} va de 1 a 5.`)

export const esquemaCrearResena = z.strictObject({
  reservaId: z.uuid('Id de reserva inválido.'),
  calificacion: puntaje('La calificación general'),
  limpieza: puntaje('La limpieza'),
  ubicacion: puntaje('La ubicación'),
  calidadPrecio: puntaje('La relación calidad-precio'),
  atencion: puntaje('La atención'),
  comentario: z
    .string({ error: 'Escribe un comentario.' })
    .trim()
    .min(10, 'Cuéntanos un poco más: el comentario debe tener al menos 10 caracteres.')
    .max(1000, 'El comentario no puede superar 1000 caracteres.'),
})

export const esquemaListarResenas = z.object({
  limite: z.coerce.number().int().min(1).max(50).default(10),
})

export const esquemaParamsResena = z.strictObject({ id: z.coerce.number().int().positive() })
