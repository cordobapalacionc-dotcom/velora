import { Router } from 'express'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { esquemaCrearReserva, esquemaListarReservas, esquemaParamsReserva } from './reservas.esquemas.js'
import { ROLES_PERSONAL, reservasServicio } from './reservas.servicio.js'

export const reservasRutas = Router()

// Todas las rutas de reservas requieren sesión.
reservasRutas.use(autenticar)

reservasRutas.post('/', validar({ body: esquemaCrearReserva }), (req, res) => {
  res.status(201).json({ datos: reservasServicio.crear(req.usuario, req.validado.body) })
})

reservasRutas.get('/mias', (req, res) => {
  res.json({ datos: reservasServicio.listarDeUsuario(req.usuario) })
})

reservasRutas.get('/', autorizar(...ROLES_PERSONAL), validar({ query: esquemaListarReservas }), (req, res) => {
  res.json({ datos: reservasServicio.listarTodas(req.validado.query) })
})

reservasRutas.get('/:id', validar({ params: esquemaParamsReserva }), (req, res) => {
  res.json({ datos: reservasServicio.obtener(req.validado.params.id, req.usuario) })
})

const ACCIONES = { 'check-in': 'check-in', 'check-out': 'check-out', cancelar: 'cancelada' }

for (const [accion, estadoNuevo] of Object.entries(ACCIONES)) {
  reservasRutas.post(`/:id/${accion}`, validar({ params: esquemaParamsReserva }), (req, res) => {
    res.json({ datos: reservasServicio.cambiarEstado(req.validado.params.id, estadoNuevo, req.usuario) })
  })
}
