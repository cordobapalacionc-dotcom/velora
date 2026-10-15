import { randomUUID } from 'node:crypto'
import { config } from '../../config/env.js'
import { enTransaccion } from '../../db/conexion.js'
import { errores } from '../../utils/errores.js'
import { ahoraISO, calcularNoches, hoyISO } from '../../utils/fechas.js'
import { generarCodigoReserva } from '../../utils/identificadores.js'
import { hotelesRepositorio } from '../hoteles/hoteles.repositorio.js'
import { reservasRepositorio as repo } from './reservas.repositorio.js'

export const ROLES_PERSONAL = ['admin', 'recepcionista']

// Máquina de estados: única fuente de verdad sobre qué transiciones son válidas.
const TRANSICIONES = {
  'check-in': { desde: 'confirmada', roles: ROLES_PERSONAL },
  'check-out': { desde: 'check-in', roles: ROLES_PERSONAL },
  cancelada: { desde: 'confirmada', roles: [...ROLES_PERSONAL, 'propietario'] },
}

const esPersonal = (usuario) => ROLES_PERSONAL.includes(usuario.rol)

/** Precio calculado siempre en el servidor: el cliente nunca envía montos. */
export function cotizar(precioNoche, noches) {
  const subtotal = precioNoche * noches
  const impuestos = Math.round(subtotal * config.reservas.impuestosPorcentaje)
  const tarifaLimpieza = config.reservas.tarifaLimpieza
  return { precioNoche, noches, subtotal, impuestos, tarifaLimpieza, total: subtotal + impuestos + tarifaLimpieza }
}

function generarCodigoUnico() {
  for (let intento = 0; intento < 10; intento++) {
    const codigo = generarCodigoReserva()
    if (!repo.existeCodigo(codigo)) return codigo
  }
  throw new Error('No se pudo generar un código de reserva único.')
}

function exigirAcceso(reserva, usuario) {
  // Se responde 404 (no 403) para no revelar que la reserva existe.
  if (!reserva || (!esPersonal(usuario) && reserva.usuarioId !== usuario.id)) {
    throw errores.noEncontrado('No encontramos esa reserva.')
  }
}

export const reservasServicio = {
  /**
   * Crea una reserva sin posibilidad de doble reserva. Tres capas, de afuera hacia adentro:
   *  1. Transacción BEGIN IMMEDIATE: toma el bloqueo de escritura ANTES de leer nada, así que
   *     las solicitudes simultáneas se atienden en fila; la segunda ve ya guardada la primera.
   *  2. INSERT ... SELECT ... WHERE NOT EXISTS (subconsulta): comprobar y guardar es una sola sentencia.
   *  3. Triggers de la BD: rechazan cualquier solapamiento aunque el código anterior fallara.
   * Si algo falla dentro de la transacción, ROLLBACK deshace todo: no quedan reservas a medias.
   */
  crear(usuario, { hotelId, habitacionId, entrada, salida, huespedes }) {
    const id = randomUUID()

    enTransaccion(() => {
      // Se lee DENTRO de la transacción: precio y capacidad no pueden cambiar hasta el COMMIT.
      const habitacion = hotelesRepositorio.buscarHabitacion(hotelId, habitacionId)
      if (!habitacion) {
        throw hotelesRepositorio.existe(hotelId)
          ? errores.noEncontrado('No encontramos esa habitación en este hotel.')
          : errores.noEncontrado('No encontramos ese hotel.')
      }
      if (habitacion.capacidad < huespedes) {
        throw errores.reglaNegocio(`La habitación admite como máximo ${habitacion.capacidad} huésped(es).`)
      }

      const insertada = repo.insertarSiDisponible({
        id,
        codigo: generarCodigoUnico(),
        usuarioId: usuario.id,
        hotelId,
        habitacionId,
        huespedNombre: usuario.nombre,
        huespedCorreo: usuario.correo,
        entrada,
        salida,
        huespedes,
        ...cotizar(habitacion.precio, calcularNoches(entrada, salida)),
      })

      if (!insertada) {
        const cruces = repo.reservasQueSeCruzan(hotelId, habitacionId, entrada, salida)
        if (cruces.length) {
          const ocupado = cruces.map((c) => `${c.entrada} a ${c.salida}`).join(', ')
          throw errores.conflicto(`La habitación ya está reservada en esas fechas (ocupada: ${ocupado}).`)
        }
        throw errores.conflicto('La habitación cambió mientras reservabas. Recarga e intenta de nuevo.')
      }
    })

    return repo.buscarPorId(id)
  },

  listarDeUsuario(usuario) {
    return repo.listar({ usuarioId: usuario.id })
  },

  listarTodas(filtros) {
    return repo.listar(filtros)
  },

  obtener(id, usuario) {
    const reserva = repo.buscarPorId(id)
    exigirAcceso(reserva, usuario)
    return reserva
  },

  cambiarEstado(id, estadoNuevo, usuario) {
    const reserva = repo.buscarPorId(id)
    exigirAcceso(reserva, usuario)

    const regla = TRANSICIONES[estadoNuevo]
    const esPropietario = reserva.usuarioId === usuario.id
    const permitido = regla.roles.includes(usuario.rol) || (regla.roles.includes('propietario') && esPropietario)
    if (!permitido) throw errores.prohibido()

    if (reserva.estado !== regla.desde) {
      throw errores.reglaNegocio(`No se puede pasar de "${reserva.estado}" a "${estadoNuevo}".`)
    }

    if (estadoNuevo === 'check-in') {
      const hoy = hoyISO()
      if (hoy < reserva.entrada) throw errores.reglaNegocio(`El check-in solo es posible a partir del ${reserva.entrada}.`)
      if (hoy >= reserva.salida) throw errores.reglaNegocio('La fecha de la estadía ya pasó; no se puede hacer check-in.')
    }

    if (!repo.cambiarEstado(id, regla.desde, estadoNuevo, ahoraISO())) {
      throw errores.conflicto('La reserva fue modificada por otra persona. Recarga e intenta de nuevo.')
    }
    return repo.buscarPorId(id)
  },
}
