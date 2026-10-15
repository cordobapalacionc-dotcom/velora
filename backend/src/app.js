import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config/env.js'
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js'
import { authRutas } from './modules/auth/auth.rutas.js'
import { catalogoRutas } from './modules/catalogo/catalogo.rutas.js'
import { hotelesRutas } from './modules/hoteles/hoteles.rutas.js'
import { reservasRutas } from './modules/reservas/reservas.rutas.js'

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

  app.get('/api/salud', (_req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }))
  app.use('/api/auth', authRutas)
  app.use('/api/catalogo', catalogoRutas)
  app.use('/api/hoteles', hotelesRutas)
  app.use('/api/reservas', reservasRutas)

  app.use(rutaNoEncontrada)
  app.use(manejadorErrores)
  return app
}
