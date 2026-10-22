import { Router } from 'express'
import { config } from '../../config/env.js'
import { obtenerDb } from '../../db/conexion.js'

export const catalogoRutas = Router()

const conTraducciones = (fila) => ({ ...fila, traducciones: JSON.parse(fila.traducciones) })

catalogoRutas.get('/destinos', (_req, res) => {
  res.json({ datos: obtenerDb().prepare('SELECT id, nombre, pais, imagen, traducciones FROM destinos ORDER BY nombre').all().map(conTraducciones) })
})

catalogoRutas.get('/colecciones', (_req, res) => {
  res.json({ datos: obtenerDb().prepare('SELECT id, nombre, imagen, traducciones FROM colecciones ORDER BY nombre').all().map(conTraducciones) })
})

// Reglas públicas que el sitio necesita mostrar (las mismas que aplica el backend).
catalogoRutas.get('/configuracion', (_req, res) => {
  res.json({
    datos: {
      tasaUsd: config.tasaUsd,
      impuestosPorcentaje: config.reservas.impuestosPorcentaje,
      tarifaLimpieza: config.reservas.tarifaLimpieza,
      cancelacionGratisDias: config.reservas.cancelacionGratisDias,
      retencionAccesosDias: config.seguridad.accesosRetencionDias,
    },
  })
})
