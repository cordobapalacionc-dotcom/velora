import { config } from '../config/env.js'
import { AppError, errores } from '../utils/errores.js'

// Códigos extendidos de SQLite: https://www.sqlite.org/rescode.html
const SQLITE_CONSTRAINT_CHECK = 275
const SQLITE_CONSTRAINT_FOREIGNKEY = 787
const SQLITE_CONSTRAINT_UNIQUE = 2067
const SQLITE_CONSTRAINT_PRIMARYKEY = 1555
const SQLITE_CONSTRAINT_TRIGGER = 1811
const SQLITE_BUSY = 5

function traducirError(error) {
  if (error instanceof AppError) return error

  if (error.type === 'entity.parse.failed') return errores.solicitudInvalida('El cuerpo de la solicitud no es JSON válido.')
  if (error.type === 'entity.too.large') return new AppError(413, 'CARGA_DEMASIADO_GRANDE', 'El cuerpo de la solicitud es demasiado grande.')

  if (error.code === 'ERR_SQLITE_ERROR') {
    // Otra transacción mantuvo el bloqueo más allá de busy_timeout (incluye BUSY_RECOVERY/BUSY_SNAPSHOT).
    if ((error.errcode & 0xff) === SQLITE_BUSY) {
      return new AppError(503, 'SERVICIO_OCUPADO', 'El sistema está procesando otras reservas. Intenta de nuevo en unos segundos.')
    }
    switch (error.errcode) {
      case SQLITE_CONSTRAINT_UNIQUE:
      case SQLITE_CONSTRAINT_PRIMARYKEY:
        return errores.conflicto('Ya existe un registro con esos datos.')
      case SQLITE_CONSTRAINT_FOREIGNKEY:
        return errores.conflicto('La operación viola una relación entre registros (por ejemplo, tiene reservas asociadas).')
      case SQLITE_CONSTRAINT_CHECK:
        return errores.reglaNegocio('Los datos no cumplen las restricciones de la base de datos.')
      case SQLITE_CONSTRAINT_TRIGGER:
        if (error.message.includes('RESERVA_SOLAPADA')) {
          return errores.conflicto('La habitación ya está reservada en esas fechas.')
        }
        return errores.reglaNegocio('Los datos no cumplen las reglas de la base de datos.')
    }
  }
  return null
}

export function rutaNoEncontrada(req, _res, next) {
  next(errores.noEncontrado(`No existe la ruta ${req.method} ${req.originalUrl}.`))
}

// eslint-disable-next-line no-unused-vars
export function manejadorErrores(error, req, res, _next) {
  const conocido = traducirError(error)

  if (!conocido) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error)
    return res.status(500).json({
      error: {
        codigo: 'ERROR_INTERNO',
        mensaje: 'Ocurrió un error inesperado.',
        ...(config.esProduccion ? {} : { detalle: error.message }),
      },
    })
  }

  res.status(conocido.estado).json({
    error: {
      codigo: conocido.codigo,
      mensaje: conocido.message,
      ...(conocido.detalles ? { detalles: conocido.detalles } : {}),
    },
  })
}
