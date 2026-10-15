import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

export const RAIZ_BACKEND = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const rutaEnv = resolve(RAIZ_BACKEND, '.env')
if (existsSync(rutaEnv)) process.loadEnvFile(rutaEnv)

const SECRETO_DESARROLLO = 'secreto-solo-para-desarrollo-no-usar-en-produccion'

const esquemaEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PUERTO: z.coerce.number().int().min(1).max(65535).default(4000),
    DB_RUTA: z.string().min(1).default('data/velora.db'),
    JWT_SECRETO: z.string().optional(),
    JWT_EXPIRACION: z.string().min(1).default('8h'),
    CORS_ORIGENES: z.string().default('http://localhost:5173'),
    TARIFA_LIMPIEZA: z.coerce.number().int().min(0).default(180000),
    IMPUESTOS_PORCENTAJE: z.coerce.number().min(0).max(1).default(0.19),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && (!env.JWT_SECRETO || env.JWT_SECRETO.length < 32)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRETO'],
        message: 'En producción JWT_SECRETO es obligatorio y debe tener al menos 32 caracteres.',
      })
    }
  })

const resultado = esquemaEnv.safeParse(process.env)
if (!resultado.success) {
  const detalle = resultado.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  console.error(`Configuración inválida:\n${detalle}`)
  process.exit(1)
}

const env = resultado.data

export const config = Object.freeze({
  entorno: env.NODE_ENV,
  esProduccion: env.NODE_ENV === 'production',
  puerto: env.PUERTO,
  dbRuta: env.DB_RUTA === ':memory:' ? ':memory:' : resolve(RAIZ_BACKEND, env.DB_RUTA),
  jwt: Object.freeze({
    secreto: env.JWT_SECRETO || SECRETO_DESARROLLO,
    expiracion: env.JWT_EXPIRACION,
  }),
  corsOrigenes: env.CORS_ORIGENES.split(',').map((o) => o.trim()).filter(Boolean),
  reservas: Object.freeze({
    tarifaLimpieza: env.TARIFA_LIMPIEZA,
    impuestosPorcentaje: env.IMPUESTOS_PORCENTAJE,
  }),
})
