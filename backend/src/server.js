import { crearApp } from './app.js'
import { config } from './config/env.js'
import { cerrarDb, iniciarDb } from './db/conexion.js'
import { accesosRepositorio } from './modules/admin/accesos.repositorio.js'

try {
  iniciarDb()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

// Los registros de acceso guardan IP y navegador (datos personales): no se conservan más de lo necesario.
function purgarAccesosViejos() {
  const borrados = accesosRepositorio.purgar(config.seguridad.accesosRetencionDias)
  if (borrados) console.log(`Se borraron ${borrados} registros de acceso de más de ${config.seguridad.accesosRetencionDias} días.`)
}
purgarAccesosViejos()
const purgaDiaria = setInterval(purgarAccesosViejos, 24 * 60 * 60 * 1000)
purgaDiaria.unref()

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
