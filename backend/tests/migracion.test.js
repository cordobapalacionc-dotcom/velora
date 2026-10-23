import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'

// Una base de datos creada antes de agregar `reservas.cancelada_por`, con un usuario dentro.
const carpeta = mkdtempSync(join(tmpdir(), 'velora-migracion-'))
const ruta = join(carpeta, 'vieja.db')
const esquemaViejo = readFileSync(new URL('../src/db/esquema.sql', import.meta.url), 'utf8')
  .split('\n')
  .filter((linea) => !linea.includes('cancelada_por'))
  .join('\n')
const vieja = new DatabaseSync(ruta)
vieja.exec(esquemaViejo)
vieja.exec("PRAGMA user_version = 2; INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES ('Ana', 'ana@correo.com', 'x');")
vieja.close()

process.env.NODE_ENV = 'test'
process.env.DB_RUTA = ruta
const { iniciarDb, cerrarDb, obtenerDb } = await import('../src/db/conexion.js')

after(() => {
  cerrarDb()
  rmSync(carpeta, { recursive: true, force: true })
})

test('una base existente recibe la columna nueva sin perder sus datos', () => {
  iniciarDb()
  const columnas = obtenerDb().prepare('PRAGMA table_info(reservas)').all().map((c) => c.name)
  assert.ok(columnas.includes('cancelada_por'))
  assert.equal(obtenerDb().prepare("SELECT COUNT(*) AS n FROM usuarios WHERE correo = 'ana@correo.com'").get().n, 1)
})
