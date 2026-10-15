import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { config } from '../../config/env.js'
import { autenticar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { esquemaLogin, esquemaRegistro } from './auth.esquemas.js'
import { authServicio } from './auth.servicio.js'

// Frena ataques de fuerza bruta sobre las credenciales.
const limiteCredenciales = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.entorno === 'test',
  message: { error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos. Espera unos minutos.' } },
})

export const authRutas = Router()

authRutas.post('/registro', limiteCredenciales, validar({ body: esquemaRegistro }), async (req, res) => {
  res.status(201).json(await authServicio.registrar(req.validado.body))
})

authRutas.post('/login', limiteCredenciales, validar({ body: esquemaLogin }), async (req, res) => {
  res.json(await authServicio.iniciarSesion(req.validado.body))
})

authRutas.get('/yo', autenticar, (req, res) => {
  res.json({ usuario: req.usuario })
})
