import { Router } from 'express'
import { z } from 'zod'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { errores } from '../../utils/errores.js'
import { hotelesRepositorio } from '../hoteles/hoteles.repositorio.js'
import { temporadasRepositorio as repo } from './temporadas.repositorio.js'

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, 'Identificador inválido.')
const campos = {
  nombre: z.string({ error: 'El nombre es obligatorio.' }).trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80),
  inicio: z.iso.date('La fecha de inicio debe tener el formato AAAA-MM-DD.'),
  fin: z.iso.date('La fecha de fin debe tener el formato AAAA-MM-DD.'),
  recargo: z
    .number({ error: 'El recargo debe ser un número.' })
    .int('El recargo debe ser un número entero (porcentaje).')
    .min(-50, 'El descuento máximo es del 50 %.')
    .max(200, 'El recargo máximo es del 200 %.')
    .refine((v) => v !== 0, 'Un recargo de 0 % no cambia nada: usa un valor distinto de 0.'),
  hotelId: slug.nullable(),
}
const fechasEnOrden = (d) => !d.inicio || !d.fin || d.fin >= d.inicio
const mensajeOrden = { message: 'La fecha de fin no puede ser anterior a la de inicio.', path: ['fin'] }

const esquemaCrear = z.strictObject({ ...campos, hotelId: campos.hotelId.default(null) }).refine(fechasEnOrden, mensajeOrden)
const esquemaActualizar = z
  .strictObject(campos)
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía al menos un campo para actualizar.')
  .refine(fechasEnOrden, mensajeOrden)
const esquemaParams = z.strictObject({ id: z.coerce.number().int().positive() })

function exigirHotelSiHay(hotelId) {
  if (hotelId && !hotelesRepositorio.existe(hotelId)) throw errores.reglaNegocio('Ese hotel no existe.')
}

export const temporadasRutas = Router()
temporadasRutas.use(autenticar, autorizar('admin'))

temporadasRutas.get('/', (_req, res) => {
  res.json({ datos: repo.listar() })
})

temporadasRutas.post('/', validar({ body: esquemaCrear }), (req, res) => {
  exigirHotelSiHay(req.validado.body.hotelId)
  res.status(201).json({ datos: repo.crear(req.validado.body) })
})

temporadasRutas.patch('/:id', validar({ params: esquemaParams, body: esquemaActualizar }), (req, res) => {
  const { id } = req.validado.params
  const actual = repo.buscarPorId(id)
  if (!actual) throw errores.noEncontrado('No encontramos esa temporada.')
  const cambios = req.validado.body
  exigirHotelSiHay(cambios.hotelId)
  if ((cambios.fin ?? actual.fin) < (cambios.inicio ?? actual.inicio)) {
    throw errores.reglaNegocio('La fecha de fin no puede ser anterior a la de inicio.')
  }
  repo.actualizar(id, cambios)
  res.json({ datos: repo.buscarPorId(id) })
})

temporadasRutas.delete('/:id', validar({ params: esquemaParams }), (req, res) => {
  if (!repo.eliminar(req.validado.params.id)) throw errores.noEncontrado('No encontramos esa temporada.')
  res.status(204).end()
})
