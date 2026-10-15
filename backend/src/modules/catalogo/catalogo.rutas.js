import { Router } from 'express'
import { obtenerDb } from '../../db/conexion.js'

export const catalogoRutas = Router()

catalogoRutas.get('/destinos', (_req, res) => {
  res.json({ datos: obtenerDb().prepare('SELECT id, nombre, pais, imagen FROM destinos ORDER BY nombre').all() })
})

catalogoRutas.get('/colecciones', (_req, res) => {
  res.json({ datos: obtenerDb().prepare('SELECT id, nombre, imagen FROM colecciones ORDER BY nombre').all() })
})
