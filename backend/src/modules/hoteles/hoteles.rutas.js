import { Router } from 'express'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import {
  esquemaActualizarHabitacion,
  esquemaActualizarHotel,
  esquemaCalendario,
  esquemaCotizacion,
  esquemaCrearHabitacion,
  esquemaCrearHotel,
  esquemaDisponibilidad,
  esquemaListarHoteles,
  esquemaParamsHabitacion,
  esquemaParamsHotel,
  esquemaSimilares,
} from './hoteles.esquemas.js'
import { esquemaListarResenas } from '../resenas/resenas.esquemas.js'
import { resenasServicio } from '../resenas/resenas.servicio.js'
import { hotelesServicio } from './hoteles.servicio.js'

export const hotelesRutas = Router()
const soloAdmin = [autenticar, autorizar('admin')]

// ---- Públicas ----

hotelesRutas.get('/', validar({ query: esquemaListarHoteles }), (req, res) => {
  res.json({ datos: hotelesServicio.listar(req.validado.query) })
})

hotelesRutas.get('/:id', validar({ params: esquemaParamsHotel }), (req, res) => {
  res.json({ datos: hotelesServicio.obtener(req.validado.params.id) })
})

hotelesRutas.get('/:id/similares', validar({ params: esquemaParamsHotel, query: esquemaSimilares }), (req, res) => {
  res.json({ datos: hotelesServicio.similares(req.validado.params.id, req.validado.query.cantidad) })
})

hotelesRutas.get(
  '/:id/disponibilidad',
  validar({ params: esquemaParamsHotel, query: esquemaDisponibilidad }),
  (req, res) => {
    res.json({ datos: hotelesServicio.disponibilidad(req.validado.params.id, req.validado.query) })
  }
)

hotelesRutas.get('/:id/calendario', validar({ params: esquemaParamsHotel, query: esquemaCalendario }), (req, res) => {
  res.json({ datos: hotelesServicio.calendario(req.validado.params.id, req.validado.query) })
})

hotelesRutas.get('/:id/cotizacion', validar({ params: esquemaParamsHotel, query: esquemaCotizacion }), (req, res) => {
  res.json({ datos: hotelesServicio.cotizacion(req.validado.params.id, req.validado.query) })
})

hotelesRutas.get('/:id/resenas', validar({ params: esquemaParamsHotel, query: esquemaListarResenas }), (req, res) => {
  res.json({ datos: resenasServicio.listarDeHotel(req.validado.params.id, req.validado.query) })
})

// ---- Administración de hoteles ----

hotelesRutas.post('/', ...soloAdmin, validar({ body: esquemaCrearHotel }), (req, res) => {
  res.status(201).json({ datos: hotelesServicio.crear(req.validado.body) })
})

hotelesRutas.patch('/:id', ...soloAdmin, validar({ params: esquemaParamsHotel, body: esquemaActualizarHotel }), (req, res) => {
  res.json({ datos: hotelesServicio.actualizar(req.validado.params.id, req.validado.body) })
})

hotelesRutas.delete('/:id', ...soloAdmin, validar({ params: esquemaParamsHotel }), (req, res) => {
  hotelesServicio.eliminar(req.validado.params.id)
  res.status(204).end()
})

// ---- Administración de habitaciones ----

hotelesRutas.post(
  '/:id/habitaciones',
  ...soloAdmin,
  validar({ params: esquemaParamsHotel, body: esquemaCrearHabitacion }),
  (req, res) => {
    res.status(201).json({ datos: hotelesServicio.crearHabitacion(req.validado.params.id, req.validado.body) })
  }
)

hotelesRutas.patch(
  '/:id/habitaciones/:habitacionId',
  ...soloAdmin,
  validar({ params: esquemaParamsHabitacion, body: esquemaActualizarHabitacion }),
  (req, res) => {
    const { id, habitacionId } = req.validado.params
    res.json({ datos: hotelesServicio.actualizarHabitacion(id, habitacionId, req.validado.body) })
  }
)

hotelesRutas.delete(
  '/:id/habitaciones/:habitacionId',
  ...soloAdmin,
  validar({ params: esquemaParamsHabitacion }),
  (req, res) => {
    const { id, habitacionId } = req.validado.params
    hotelesServicio.eliminarHabitacion(id, habitacionId)
    res.status(204).end()
  }
)
