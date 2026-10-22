import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { config } from '../../config/env.js'
import { autenticar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { esquemaLogin, esquemaRecuperar, esquemaRegistro, esquemaRestablecer } from './auth.esquemas.js'
import { authServicio } from './auth.servicio.js'

// Frena ataques de fuerza bruta desde una misma IP. Además, cada cuenta se bloquea sola
// tras varios intentos fallidos (ver auth.servicio.js), venga de la IP que venga.
const limiteCredenciales = rateLimit({
  windowMs: 15 * 60 * 1000,
  // En desarrollo todas las pruebas salen de la misma IP (localhost): se permite más para no frenarlas.
  limit: config.esProduccion ? 30 : 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.entorno === 'test',
  message: { error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos desde esta conexión. Espera unos minutos.' } },
})

export const authRutas = Router()

const contextoDe = (req) => ({ ip: req.ip, navegador: req.get('user-agent') })

authRutas.post('/registro', limiteCredenciales, validar({ body: esquemaRegistro }), async (req, res) => {
  res.status(201).json(await authServicio.registrar(req.validado.body, contextoDe(req)))
})

authRutas.post('/login', limiteCredenciales, validar({ body: esquemaLogin }), async (req, res) => {
  res.json(await authServicio.iniciarSesion(req.validado.body, contextoDe(req)))
})

authRutas.post('/recuperar', limiteCredenciales, validar({ body: esquemaRecuperar }), (req, res) => {
  res.json(authServicio.solicitarRestablecimiento(req.validado.body))
})

authRutas.post('/restablecer', limiteCredenciales, validar({ body: esquemaRestablecer }), async (req, res) => {
  res.json(await authServicio.restablecer(req.validado.body, contextoDe(req)))
})

authRutas.get('/yo', autenticar, (req, res) => {
  res.json({ usuario: req.usuario })
})
