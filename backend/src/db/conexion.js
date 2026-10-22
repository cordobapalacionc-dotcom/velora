import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from '../config/env.js'
import { sembrarSiVacia } from './sembrar.js'

// Súbelo cada vez que cambie una tabla que ya existía en esquema.sql.
// v2: temporadas, reseñas, traducciones, colecciones por hotel, historial de cambios y cargo de cancelación.
export const VERSION_ESQUEMA = 2

let db = null

export function obtenerDb() {
  if (!db) throw new Error('La base de datos no está inicializada. Llama a iniciarDb() primero.')
  return db
}

export function iniciarDb(ruta = config.dbRuta) {
  if (db) return db
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true })

  const conexion = new DatabaseSync(ruta)
  // `CREATE TABLE IF NOT EXISTS` no agrega columnas a una tabla vieja: si la BD es de una versión
  // anterior, se avisa en vez de arrancar con un esquema a medias.
  const { user_version: version } = conexion.prepare('PRAGMA user_version').get()
  const tieneTablas = conexion.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'").get()
  if (tieneTablas && version < VERSION_ESQUEMA) {
    conexion.close()
    throw new Error(
      `La base de datos ${ruta} es de una versión anterior (v${version}, se necesita v${VERSION_ESQUEMA}). ` +
        'Ejecuta "npm run db:reset" en la carpeta backend para recrearla con los datos de ejemplo.'
    )
  }

  db = conexion
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(readFileSync(new URL('./esquema.sql', import.meta.url), 'utf8'))
  db.exec(`PRAGMA user_version = ${VERSION_ESQUEMA};`)
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
