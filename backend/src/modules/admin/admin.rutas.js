import { Router } from 'express'
import { z } from 'zod'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { validar } from '../../middlewares/validar.js'
import { accesosRepositorio } from './accesos.repositorio.js'
import { calcularMetricas } from './metricas.servicio.js'

export const adminRutas = Router()
adminRutas.use(autenticar, autorizar('admin'))

const esquemaAccesos = z.object({
  dias: z.coerce.number().int().min(1).max(90).default(14),
})

// Periodo [desde, hasta): "hasta" no se incluye. Máximo 2 años.
const esquemaMetricas = z
  .object({
    desde: z.iso.date('La fecha "desde" debe tener el formato AAAA-MM-DD.'),
    hasta: z.iso.date('La fecha "hasta" debe tener el formato AAAA-MM-DD.'),
  })
  .refine((d) => d.hasta > d.desde, { message: '"hasta" debe ser posterior a "desde".', path: ['hasta'] })
  .refine((d) => Date.parse(d.hasta) - Date.parse(d.desde) <= 731 * 86400000, {
    message: 'El periodo no puede superar 2 años.',
    path: ['hasta'],
  })

adminRutas.get('/accesos', validar({ query: esquemaAccesos }), (req, res) => {
  const { dias } = req.validado.query
  res.json({
    datos: {
      dias,
      resumen: accesosRepositorio.resumen(dias),
      porDia: accesosRepositorio.porDia(dias),
      usuarios: accesosRepositorio.usuariosActivos(dias),
      recientes: accesosRepositorio.recientes(25),
    },
  })
})

adminRutas.get('/metricas', validar({ query: esquemaMetricas }), (req, res) => {
  res.json({ datos: calcularMetricas(req.validado.query.desde, req.validado.query.hasta) })
})
