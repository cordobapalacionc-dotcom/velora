import { Router } from 'express'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { hoyISO } from '../../utils/fechas.js'
import {
  esquemaCancelarReserva,
  esquemaCrearReserva,
  esquemaListarReservas,
  esquemaModificarReserva,
  esquemaParamsReserva,
} from './reservas.esquemas.js'
import { ROLES_PERSONAL, reservasACsv, reservasServicio } from './reservas.servicio.js'

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

// Descarga para Excel con los mismos filtros que el listado. Va antes de "/:id" para que no la capture.
reservasRutas.get('/exportar', autorizar('admin'), validar({ query: esquemaListarReservas }), (req, res) => {
  const csv = reservasACsv(reservasServicio.listarTodas(req.validado.query))
  res
    .type('text/csv; charset=utf-8')
    .attachment(`reservas-velora-${hoyISO()}.csv`)
    .send(csv)
})

reservasRutas.get('/:id', validar({ params: esquemaParamsReserva }), (req, res) => {
  res.json({ datos: reservasServicio.obtener(req.validado.params.id, req.usuario) })
})

reservasRutas.patch(
  '/:id',
  autorizar(...ROLES_PERSONAL),
  validar({ params: esquemaParamsReserva, body: esquemaModificarReserva }),
  (req, res) => {
    res.json({ datos: reservasServicio.modificar(req.validado.params.id, req.validado.body, req.usuario) })
  }
)

for (const [accion, estadoNuevo] of Object.entries({ 'check-in': 'check-in', 'check-out': 'check-out' })) {
  reservasRutas.post(`/:id/${accion}`, validar({ params: esquemaParamsReserva }), (req, res) => {
    res.json({ datos: reservasServicio.cambiarEstado(req.validado.params.id, estadoNuevo, req.usuario) })
  })
}

reservasRutas.post('/:id/cancelar', validar({ params: esquemaParamsReserva, body: esquemaCancelarReserva }), (req, res) => {
  res.json({ datos: reservasServicio.cambiarEstado(req.validado.params.id, 'cancelada', req.usuario, req.validado.body) })
})
