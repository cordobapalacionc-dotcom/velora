import { randomUUID } from 'node:crypto'
import { config } from '../../config/env.js'
import { enTransaccion } from '../../db/conexion.js'
import { errores } from '../../utils/errores.js'
import { ahoraISO, calcularNoches, hoyISO } from '../../utils/fechas.js'
import { generarCodigoReserva } from '../../utils/identificadores.js'
import { enviarCorreoSinEsperar } from '../correo/correo.servicio.js'
import { hotelesRepositorio } from '../hoteles/hoteles.repositorio.js'
import { cotizarParaHotel, politicaCancelacion } from '../tarifas/tarifas.servicio.js'
import { MAX_NOCHES } from './reservas.esquemas.js'
import { reservasRepositorio as repo } from './reservas.repositorio.js'

export const ROLES_PERSONAL = ['admin', 'recepcionista']

// Máquina de estados: única fuente de verdad sobre qué transiciones son válidas.
const TRANSICIONES = {
  'check-in': { desde: 'confirmada', roles: ROLES_PERSONAL },
  'check-out': { desde: 'check-in', roles: ROLES_PERSONAL },
  cancelada: { desde: 'confirmada', roles: [...ROLES_PERSONAL, 'propietario'] },
}

const esPersonal = (usuario) => ROLES_PERSONAL.includes(usuario.rol)

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const fechaLarga = (iso) => formatoFecha.format(new Date(`${iso}T00:00:00Z`))
const enlaceMisReservas = () => ({ texto: 'Ver mis reservas', url: `${config.urlSitio}/mis-reservas` })

/** La política de cancelación solo tiene sentido mientras la reserva se puede cancelar. */
function conPolitica(reserva) {
  if (!reserva) return reserva
  return reserva.estado === 'confirmada' ? { ...reserva, cancelacion: politicaCancelacion(reserva) } : reserva
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

function errorDeCruce(cruces) {
  const ocupado = cruces.map((c) => `${c.entrada} a ${c.salida}`).join(', ')
  return errores.conflicto(`La habitación ya está reservada en esas fechas (ocupada: ${ocupado}).`)
}

function describirCambios(antes, despues) {
  const partes = []
  if (antes.habitacionId !== despues.habitacionId) partes.push(`habitación: ${antes.habitacionNombre} → ${despues.habitacionNombre}`)
  if (antes.entrada !== despues.entrada) partes.push(`llegada: ${antes.entrada} → ${despues.entrada}`)
  if (antes.salida !== despues.salida) partes.push(`salida: ${antes.salida} → ${despues.salida}`)
  if (antes.huespedes !== despues.huespedes) partes.push(`huéspedes: ${antes.huespedes} → ${despues.huespedes}`)
  return partes.join(' · ')
}

function avisarConfirmacion(reserva) {
  const politica = politicaCancelacion(reserva)
  const cancelacion =
    politica.cargoSiCancelaHoy === 0
      ? `Puedes cancelar gratis hasta el ${fechaLarga(politica.gratisHasta)}. Después se cobra una noche (${pesos.format(politica.cargoTardio)}).`
      : `Esta reserva está dentro de las ${politica.diasDeAnticipacion * 24} horas previas a la llegada: si la cancelas se cobra una noche (${pesos.format(politica.cargoTardio)}).`
  enviarCorreoSinEsperar({
    para: reserva.huespedCorreo,
    asunto: `Reserva confirmada ${reserva.codigo} · ${reserva.hotelNombre}`,
    titulo: `Tu reserva en ${reserva.hotelNombre} está confirmada`,
    parrafos: [
      `Hola, ${reserva.huespedNombre}. Este es el resumen de tu reserva ${reserva.codigo}:`,
      `${reserva.habitacionNombre} · del ${fechaLarga(reserva.entrada)} al ${fechaLarga(reserva.salida)} (${reserva.noches} ${reserva.noches === 1 ? 'noche' : 'noches'}) · ${reserva.huespedes} ${reserva.huespedes === 1 ? 'huésped' : 'huéspedes'}.`,
      `Total: ${pesos.format(reserva.total)} (incluye impuestos y limpieza).`,
      cancelacion,
      'Presenta el código de la reserva en recepción al llegar.',
    ],
    boton: enlaceMisReservas(),
  })
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
      // Se lee DENTRO de la transacción: precio, capacidad y temporadas no pueden cambiar hasta el COMMIT.
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
        ...cotizarParaHotel(hotelId, habitacion.precio, entrada, salida),
      })

      if (!insertada) {
        const cruces = repo.reservasQueSeCruzan(hotelId, habitacionId, entrada, salida)
        if (cruces.length) throw errorDeCruce(cruces)
        throw errores.conflicto('La habitación cambió mientras reservabas. Recarga e intenta de nuevo.')
      }
    })

    const reserva = repo.buscarPorId(id)
    avisarConfirmacion(reserva)
    return conPolitica(reserva)
  },

  /**
   * Modifica una reserva (solo personal). Mismas garantías que crear(): todo ocurre dentro de una
   * transacción BEGIN IMMEDIATE y el UPDATE comprueba disponibilidad con una subconsulta NOT EXISTS.
   *  - 'confirmada': se pueden cambiar habitación, fechas y huéspedes.
   *  - 'check-in':   el huésped ya está en la habitación; solo cambian la salida y los huéspedes.
   * Cada cambio queda en el historial (quién, cuándo, qué) y se avisa al huésped por correo.
   */
  modificar(id, cambios, usuario) {
    const resultado = enTransaccion(() => {
      const reserva = repo.buscarPorId(id)
      if (!reserva) throw errores.noEncontrado('No encontramos esa reserva.')

      if (!['confirmada', 'check-in'].includes(reserva.estado)) {
        throw errores.reglaNegocio('Solo se pueden modificar reservas confirmadas o con el huésped en casa.')
      }
      if (
        reserva.estado === 'check-in' &&
        ((cambios.entrada && cambios.entrada !== reserva.entrada) || (cambios.habitacionId && cambios.habitacionId !== reserva.habitacionId))
      ) {
        throw errores.reglaNegocio('El huésped ya hizo check-in: solo se pueden cambiar la salida y los huéspedes.')
      }

      const nueva = {
        habitacionId: cambios.habitacionId ?? reserva.habitacionId,
        entrada: cambios.entrada ?? reserva.entrada,
        salida: cambios.salida ?? reserva.salida,
        huespedes: cambios.huespedes ?? reserva.huespedes,
      }
      const hoy = hoyISO()
      if (nueva.entrada !== reserva.entrada && nueva.entrada < hoy) throw errores.reglaNegocio('La fecha de llegada no puede estar en el pasado.')
      if (nueva.salida <= nueva.entrada) throw errores.reglaNegocio('La fecha de salida debe ser posterior a la de llegada.')
      if (nueva.salida !== reserva.salida && nueva.salida < hoy) throw errores.reglaNegocio('La fecha de salida no puede estar en el pasado.')
      const noches = calcularNoches(nueva.entrada, nueva.salida)
      if (noches > MAX_NOCHES) throw errores.reglaNegocio(`La estadía máxima es de ${MAX_NOCHES} noches.`)

      const habitacion = hotelesRepositorio.buscarHabitacion(reserva.hotelId, nueva.habitacionId)
      if (!habitacion) throw errores.noEncontrado('No encontramos esa habitación en este hotel.')
      if (habitacion.capacidad < nueva.huespedes) {
        throw errores.reglaNegocio(`La habitación admite como máximo ${habitacion.capacidad} huésped(es).`)
      }

      const detalle = describirCambios(reserva, { ...nueva, habitacionNombre: habitacion.nombre })
      if (!detalle) return { reserva, cambio: null } // no cambió nada: no se toca la BD ni el historial

      // Misma habitación → se respeta el precio base acordado. Otra habitación → su precio actual.
      // En ambos casos cada noche se ajusta según su temporada.
      const precioBase = nueva.habitacionId === reserva.habitacionId ? reserva.precioNoche : habitacion.precio
      const cotizacion = cotizarParaHotel(reserva.hotelId, precioBase, nueva.entrada, nueva.salida)

      const aplicada = repo.modificarSiDisponible({
        id,
        estadoLeido: reserva.estado,
        ...nueva,
        habitacionNombre: habitacion.nombre,
        ...cotizacion,
      })
      if (!aplicada) {
        const cruces = repo.reservasQueSeCruzan(reserva.hotelId, nueva.habitacionId, nueva.entrada, nueva.salida, id)
        if (cruces.length) throw errorDeCruce(cruces)
        throw errores.conflicto('La reserva fue modificada por otra persona. Recarga e intenta de nuevo.')
      }

      repo.registrarModificacion({
        reservaId: id,
        usuarioId: usuario.id,
        porCorreo: usuario.correo,
        detalle,
        totalAnterior: reserva.total,
        totalNuevo: cotizacion.total,
      })
      return { reserva: repo.buscarPorId(id), cambio: { detalle, totalAnterior: reserva.total } }
    })

    const { reserva, cambio } = resultado
    if (cambio) {
      enviarCorreoSinEsperar({
        para: reserva.huespedCorreo,
        asunto: `Cambios en tu reserva ${reserva.codigo}`,
        titulo: `El hotel modificó tu reserva ${reserva.codigo}`,
        parrafos: [
          `Hola, ${reserva.huespedNombre}. ${reserva.hotelNombre} hizo estos cambios en tu reserva:`,
          cambio.detalle,
          `Ahora es ${reserva.habitacionNombre}, del ${fechaLarga(reserva.entrada)} al ${fechaLarga(reserva.salida)}.`,
          `Total anterior: ${pesos.format(cambio.totalAnterior)}. Total nuevo: ${pesos.format(reserva.total)}.`,
          'Si no solicitaste este cambio, comunícate con el hotel.',
        ],
        boton: enlaceMisReservas(),
      })
    }
    return conPolitica(reserva)
  },

  listarDeUsuario(usuario) {
    return repo.listar({ usuarioId: usuario.id }).map(conPolitica)
  },

  listarTodas(filtros) {
    return repo.listar(filtros).map(conPolitica)
  },

  obtener(id, usuario) {
    const reserva = repo.buscarPorId(id)
    exigirAcceso(reserva, usuario)
    return conPolitica(reserva)
  },

  cambiarEstado(id, estadoNuevo, usuario, { exonerarCargo = false } = {}) {
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

    let cargo = null
    let canceladaPor = null
    if (estadoNuevo === 'cancelada') {
      // Si el huésped cancela su propia reserva es 'huesped'; si lo hace recepción o el admin, 'hotel'.
      canceladaPor = esPersonal(usuario) ? 'hotel' : 'huesped'
      if (exonerarCargo && !esPersonal(usuario)) throw errores.prohibido('Solo el hotel puede exonerar el cargo por cancelación.')
      cargo = exonerarCargo ? 0 : politicaCancelacion(reserva).cargoSiCancelaHoy
    }

    if (!repo.cambiarEstado(id, regla.desde, estadoNuevo, ahoraISO(), cargo, canceladaPor)) {
      throw errores.conflicto('La reserva fue modificada por otra persona. Recarga e intenta de nuevo.')
    }

    const actualizada = repo.buscarPorId(id)
    if (estadoNuevo === 'cancelada') {
      enviarCorreoSinEsperar({
        para: actualizada.huespedCorreo,
        asunto: `Reserva cancelada ${actualizada.codigo}`,
        titulo: `Tu reserva ${actualizada.codigo} fue cancelada`,
        parrafos: [
          `Hola, ${actualizada.huespedNombre}. La reserva en ${actualizada.hotelNombre} del ${fechaLarga(actualizada.entrada)} quedó cancelada${canceladaPor === 'hotel' ? ' por el hotel' : ''}.`,
          cargo > 0
            ? `Como se canceló dentro de las ${config.reservas.cancelacionGratisDias * 24} horas previas a la llegada, se cobra una noche: ${pesos.format(cargo)}.`
            : 'La cancelación no tiene ningún cargo.',
        ],
      })
    }
    return conPolitica(actualizada)
  },
}

// ---- Exportación ----

const COLUMNAS_CSV = [
  ['Código', (r) => r.codigo],
  ['Estado', (r) => r.estado],
  ['Hotel', (r) => r.hotelNombre],
  ['Habitación', (r) => r.habitacionNombre],
  ['Huésped', (r) => r.huespedNombre],
  ['Correo', (r) => r.huespedCorreo],
  ['Llegada', (r) => r.entrada],
  ['Salida', (r) => r.salida],
  ['Noches', (r) => r.noches],
  ['Huéspedes', (r) => r.huespedes],
  ['Precio base por noche', (r) => r.precioNoche],
  ['Subtotal', (r) => r.subtotal],
  ['Impuestos', (r) => r.impuestos],
  ['Limpieza', (r) => r.tarifaLimpieza],
  ['Total', (r) => r.total],
  ['Cargo por cancelación', (r) => r.cargoCancelacion ?? ''],
  ['Cancelada por', (r) => ({ huesped: 'Huésped', hotel: 'Hotel' })[r.canceladaPor] ?? ''],
  ['Creada', (r) => r.fechaCreacion],
  ['Modificaciones', (r) => r.modificaciones.length],
]

/** Una celda segura: entre comillas si hace falta y sin fórmulas (evita inyección de fórmulas en Excel). */
function celda(valor) {
  let texto = String(valor ?? '')
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * CSV para Excel en español: separador ";" (el que usa Excel con configuración regional de Colombia)
 * y BOM UTF-8 para que las tildes se vean bien. Los montos van sin puntos para que Excel los sume.
 */
export function reservasACsv(reservas) {
  const filas = [COLUMNAS_CSV.map(([titulo]) => titulo), ...reservas.map((r) => COLUMNAS_CSV.map(([, valor]) => valor(r)))]
  return '﻿' + filas.map((fila) => fila.map(celda).join(';')).join('\r\n') + '\r\n'
}
