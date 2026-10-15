import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from '../config/env.js'
import { sembrarSiVacia } from './sembrar.js'

let db = null

export function obtenerDb() {
  if (!db) throw new Error('La base de datos no está inicializada. Llama a iniciarDb() primero.')
  return db
}

export function iniciarDb(ruta = config.dbRuta) {
  if (db) return db
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true })

  db = new DatabaseSync(ruta)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(readFileSync(new URL('./esquema.sql', import.meta.url), 'utf8'))
  sembrarSiVacia(db)
  return db
}

export function cerrarDb() {
  db?.close()
  db = null
}

/** Ejecuta `fn` dentro de una transacción; si lanza, se revierte todo. */
export function enTransaccion(fn) {
  const conexion = obtenerDb()
  conexion.exec('BEGIN IMMEDIATE')
  try {
    const resultado = fn(conexion)
    conexion.exec('COMMIT')
    return resultado
  } catch (error) {
    conexion.exec('ROLLBACK')
    throw error
  }
}
