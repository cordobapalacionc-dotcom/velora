// Borra la base de datos local y la vuelve a crear con los datos semilla.
// Uso: npm run db:reset
import { rmSync } from 'node:fs'
import { config } from '../config/env.js'
import { cerrarDb, iniciarDb } from './conexion.js'

if (config.esProduccion) {
  console.error('db:reset está deshabilitado en producción.')
  process.exit(1)
}

if (config.dbRuta !== ':memory:') {
  for (const sufijo of ['', '-wal', '-shm']) rmSync(config.dbRuta + sufijo, { force: true })
}

iniciarDb()
cerrarDb()
console.log(`Base de datos reiniciada en ${config.dbRuta}`)
