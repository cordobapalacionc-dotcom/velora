import { mkdirSync } from 'node:fs'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config/env.js'
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js'
import { authRutas } from './modules/auth/auth.rutas.js'
import { catalogoRutas } from './modules/catalogo/catalogo.rutas.js'
import { hotelesRutas } from './modules/hoteles/hoteles.rutas.js'
import { imagenesRutas } from './modules/imagenes/imagenes.rutas.js'
import { reservasRutas } from './modules/reservas/reservas.rutas.js'

// Si agregas una ruta nueva, agrégala también aquí y en backend/README.md.
const INDICE_API = Object.freeze({
  nombre: 'API de Velora',
  estado: 'ok',
  documentacion: 'backend/README.md',
  rutas: {
    sistema: ['GET /api', 'GET /api/salud'],
    autenticacion: ['POST /api/auth/registro', 'POST /api/auth/login', 'GET /api/auth/yo (sesión)'],
    catalogo: ['GET /api/catalogo/destinos', 'GET /api/catalogo/colecciones'],
    hoteles: [
      'GET /api/hoteles?destino=&huespedes=',
      'GET /api/hoteles/:id',
      'GET /api/hoteles/:id/similares?cantidad=',
      'GET /api/hoteles/:id/disponibilidad?entrada=&salida=&huespedes=',
      'POST /api/hoteles (admin)',
      'PATCH /api/hoteles/:id (admin)',
      'DELETE /api/hoteles/:id (admin)',
      'POST /api/hoteles/:id/habitaciones (admin)',
      'PATCH /api/hoteles/:id/habitaciones/:habitacionId (admin)',
      'DELETE /api/hoteles/:id/habitaciones/:habitacionId (admin)',
    ],
    reservas: [
      'POST /api/reservas (sesión)',
      'GET /api/reservas/mias (sesión)',
      'GET /api/reservas?q=&estado=&hotelId= (admin, recepcionista)',
      'GET /api/reservas/:id (propietario o personal)',
      'POST /api/reservas/:id/check-in (admin, recepcionista)',
      'POST /api/reservas/:id/check-out (admin, recepcionista)',
      'POST /api/reservas/:id/cancelar (propietario o personal)',
    ],
    imagenes: ['POST /api/imagenes (admin, multipart campo "imagen")', 'GET /uploads/:nombre'],
  },
})

export function crearApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: config.corsOrigenes,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  app.use(express.json({ limit: '100kb', strict: true }))

  if (config.entorno === 'development') {
    app.use((req, res, next) => {
      const inicio = performance.now()
      res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${(performance.now() - inicio).toFixed(1)} ms)`)
      })
      next()
    })
  }

  // Imágenes subidas: archivos estáticos. Su nombre es un UUID que nunca cambia, así que se cachean.
  // Cross-Origin-Resource-Policy permite mostrarlas en el frontend (otro origen: localhost:5173).
  mkdirSync(config.imagenes.carpeta, { recursive: true })
  app.use(
    '/uploads',
    express.static(config.imagenes.carpeta, {
      index: false,
      dotfiles: 'deny',
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
    })
  )

  // Portada de la API: confirma que está viva y lista las rutas disponibles.
  app.get('/api', (_req, res) => res.json(INDICE_API))
  app.get('/api/salud', (_req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }))
  app.use('/api/auth', authRutas)
  app.use('/api/catalogo', catalogoRutas)
  app.use('/api/hoteles', hotelesRutas)
  app.use('/api/reservas', reservasRutas)
  app.use('/api/imagenes', imagenesRutas)

  app.use(rutaNoEncontrada)
  app.use(manejadorErrores)
  return app
}
