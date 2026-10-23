// Borra los usuarios que crean las pruebas automáticas del sitio ("Ana Prueba", "Beto Prueba"…,
// con correo @correo.com) junto con sus reservas, reseñas y registros de acceso.
// No toca las cuentas de admin y recepción ni ninguna otra cuenta.
//
// Uso:  npm run db:borrar-pruebas               → solo muestra qué se borraría
//       npm run db:borrar-pruebas -- --confirmar → hace una copia de seguridad y borra
import { DatabaseSync } from 'node:sqlite'
import { config } from '../config/env.js'

if (config.esProduccion) {
  console.error('Este script está deshabilitado en producción.')
  process.exit(1)
}

const confirmar = process.argv.includes('--confirmar')
const db = new DatabaseSync(config.dbRuta)
db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')

const ES_DE_PRUEBA = "correo LIKE '%@correo.com' AND nombre LIKE '% Prueba'"
const usuarios = db
  .prepare(
    `SELECT u.id, u.nombre, u.correo,
            (SELECT COUNT(*) FROM reservas r WHERE r.usuario_id = u.id) AS reservas,
            (SELECT COUNT(*) FROM reservas r WHERE r.usuario_id = u.id AND r.estado = 'cancelada') AS canceladas,
            (SELECT COUNT(*) FROM resenas r WHERE r.usuario_id = u.id) AS resenas
     FROM usuarios u WHERE ${ES_DE_PRUEBA} ORDER BY u.id`
  )
  .all()

if (!usuarios.length) {
  console.log('No hay usuarios de prueba.')
  process.exit(0)
}

console.table(usuarios)
const quedan = db.prepare(`SELECT correo, rol FROM usuarios WHERE NOT (${ES_DE_PRUEBA}) ORDER BY id`).all()
console.log('Se conservan:', quedan.map((u) => `${u.correo} (${u.rol})`).join(', '))

if (!confirmar) {
  console.log(`\nSe borrarían ${usuarios.length} usuarios de prueba. Para hacerlo: npm run db:borrar-pruebas -- --confirmar`)
  process.exit(0)
}

const respaldo = config.dbRuta.replace(/\.db$/, `-respaldo-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
db.exec(`VACUUM INTO '${respaldo.replace(/'/g, "''")}'`)
console.log(`\nCopia de seguridad: ${respaldo}`)

const ids = JSON.stringify(usuarios.map((u) => u.id))
const EN_IDS = 'IN (SELECT value FROM json_each(?))'
db.exec('BEGIN IMMEDIATE')
try {
  // Las reservas impiden borrar a su dueño (ON DELETE RESTRICT): primero ellas. Su historial de cambios se va con ellas.
  const borrados = {
    resenas: db.prepare(`DELETE FROM resenas WHERE usuario_id ${EN_IDS}`).run(ids).changes,
    reservas: db.prepare(`DELETE FROM reservas WHERE usuario_id ${EN_IDS}`).run(ids).changes,
    accesos: db.prepare(`DELETE FROM inicios_sesion WHERE usuario_id ${EN_IDS} OR correo LIKE '%@correo.com'`).run(ids).changes,
    usuarios: db.prepare(`DELETE FROM usuarios WHERE id ${EN_IDS}`).run(ids).changes,
  }
  db.exec('COMMIT')
  console.log('Borrado:', borrados)
} catch (error) {
  db.exec('ROLLBACK')
  console.error('No se borró nada:', error.message)
  process.exit(1)
} finally {
  db.close()
}
