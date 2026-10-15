import { crearApp } from './app.js'
import { config } from './config/env.js'
import { cerrarDb, iniciarDb } from './db/conexion.js'

iniciarDb()
const servidor = crearApp().listen(config.puerto, () => {
  console.log(`API de Velora escuchando en http://localhost:${config.puerto}/api (${config.entorno})`)
})

function apagar(senal) {
  console.log(`\n${senal} recibido, cerrando servidor...`)
  servidor.close(() => {
    cerrarDb()
    process.exit(0)
  })
}

process.on('SIGINT', apagar)
process.on('SIGTERM', apagar)
