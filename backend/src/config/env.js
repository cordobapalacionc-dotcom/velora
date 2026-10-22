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
    UPLOADS_RUTA: z.string().min(1).default('uploads'),
    IMAGEN_MAX_MB: z.coerce.number().positive().max(20).default(5),
    URL_PUBLICA: z.url().optional(),
    // Dirección del sitio (frontend): se usa en los enlaces de los correos.
    URL_SITIO: z.url().default('http://localhost:5173'),
    CANCELACION_GRATIS_DIAS: z.coerce.number().int().min(0).max(60).default(2),
    BLOQUEO_INTENTOS: z.coerce.number().int().min(3).max(50).default(5),
    BLOQUEO_MINUTOS: z.coerce.number().int().min(1).max(1440).default(15),
    ACCESOS_RETENCION_DIAS: z.coerce.number().int().min(7).max(3650).default(90),
    // Pesos colombianos por dólar. Solo sirve para mostrar precios aproximados en USD: se cobra en COP.
    TASA_USD: z.coerce.number().positive().default(4000),
    // Correo saliente. Sin SMTP_HOST los correos se guardan como archivos en CORREOS_RUTA (modo desarrollo).
    SMTP_HOST: z.string().optional(),
    SMTP_PUERTO: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USUARIO: z.string().optional(),
    SMTP_CLAVE: z.string().optional(),
    CORREO_REMITENTE: z.string().default('Velora <no-responder@velora.com>'),
    CORREOS_RUTA: z.string().min(1).default('data/correos'),
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
  imagenes: Object.freeze({
    carpeta: resolve(RAIZ_BACKEND, env.UPLOADS_RUTA),
    maxBytes: Math.round(env.IMAGEN_MAX_MB * 1024 * 1024),
    // Base para construir la URL pública de cada imagen. Si no se define, se usa el host de la petición.
    urlPublica: env.URL_PUBLICA?.replace(/\/+$/, ''),
  }),
  reservas: Object.freeze({
    tarifaLimpieza: env.TARIFA_LIMPIEZA,
    impuestosPorcentaje: env.IMPUESTOS_PORCENTAJE,
    cancelacionGratisDias: env.CANCELACION_GRATIS_DIAS,
  }),
  seguridad: Object.freeze({
    bloqueoIntentos: env.BLOQUEO_INTENTOS,
    bloqueoMinutos: env.BLOQUEO_MINUTOS,
    accesosRetencionDias: env.ACCESOS_RETENCION_DIAS,
  }),
  urlSitio: env.URL_SITIO.replace(/\/+$/, ''),
  tasaUsd: env.TASA_USD,
  correo: Object.freeze({
    smtp: env.SMTP_HOST
      ? Object.freeze({
          host: env.SMTP_HOST,
          port: env.SMTP_PUERTO,
          secure: env.SMTP_PUERTO === 465,
          auth: env.SMTP_USUARIO ? { user: env.SMTP_USUARIO, pass: env.SMTP_CLAVE } : undefined,
        })
      : null,
    remitente: env.CORREO_REMITENTE,
    carpeta: resolve(RAIZ_BACKEND, env.CORREOS_RUTA),
  }),
})
