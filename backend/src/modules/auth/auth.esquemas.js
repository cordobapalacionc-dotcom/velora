import { z } from 'zod'

const correo = z
  .string({ error: 'El correo es obligatorio.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('El correo no es válido.').max(120))

const contrasenaNueva = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número.')

export const esquemaRegistro = z.strictObject({
  nombre: z.string({ error: 'El nombre es obligatorio.' }).trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80),
  correo,
  contrasena: contrasenaNueva,
})

export const esquemaLogin = z.strictObject({
  correo,
  contrasena: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.').max(72),
})

export const esquemaRecuperar = z.strictObject({ correo })

export const esquemaRestablecer = z.strictObject({
  token: z.string({ error: 'Falta el código del enlace.' }).regex(/^[A-Za-z0-9_-]{43}$/, 'El enlace no es válido.'),
  contrasena: contrasenaNueva,
})
