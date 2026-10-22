import { Router } from 'express'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { esquemaCrearResena, esquemaParamsResena } from './resenas.esquemas.js'
import { resenasServicio } from './resenas.servicio.js'

// Las reseñas públicas de cada hotel están en GET /api/hoteles/:id/resenas.
export const resenasRutas = Router()
resenasRutas.use(autenticar)

resenasRutas.post('/', validar({ body: esquemaCrearResena }), (req, res) => {
  res.status(201).json({ datos: resenasServicio.crear(req.usuario, req.validado.body) })
})

resenasRutas.get('/', autorizar('admin'), (_req, res) => {
  res.json({ datos: resenasServicio.recientes() })
})

resenasRutas.delete('/:id', autorizar('admin'), validar({ params: esquemaParamsResena }), (req, res) => {
  resenasServicio.eliminar(req.validado.params.id)
  res.status(204).end()
})
