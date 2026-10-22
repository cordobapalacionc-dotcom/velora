import { config } from '../../config/env.js'
import { hoyISO, nochesDeEstadia, sumarDias } from '../../utils/fechas.js'
import { temporadasRepositorio } from './temporadas.repositorio.js'

/** La temporada que rige una noche: la de mayor recargo entre las que la incluyen (o ninguna). */
function temporadaDeLaNoche(fecha, temporadas) {
  let elegida = null
  for (const t of temporadas) {
    if (t.inicio <= fecha && fecha <= t.fin && (!elegida || t.recargo > elegida.recargo)) elegida = t
  }
  return elegida
}

/**
 * Precio de una estadía calculado noche por noche. El precio base es el de la habitación
 * (o el acordado al reservar); cada noche se ajusta según su temporada.
 * Es la única fórmula de precios del sistema: el cliente nunca envía montos.
 */
export function cotizarEstadia(precioBase, entrada, salida, temporadas) {
  const detalleNoches = nochesDeEstadia(entrada, salida).map((fecha) => {
    const temporada = temporadaDeLaNoche(fecha, temporadas)
    return {
      fecha,
      precio: Math.round(precioBase * (1 + (temporada?.recargo ?? 0) / 100)),
      temporada: temporada ? { nombre: temporada.nombre, recargo: temporada.recargo } : null,
    }
  })
  const subtotal = detalleNoches.reduce((suma, n) => suma + n.precio, 0)
  const impuestos = Math.round(subtotal * config.reservas.impuestosPorcentaje)
  const tarifaLimpieza = config.reservas.tarifaLimpieza
  return {
    precioNoche: precioBase,
    noches: detalleNoches.length,
    detalleNoches,
    subtotal,
    impuestos,
    tarifaLimpieza,
    total: subtotal + impuestos + tarifaLimpieza,
  }
}

/** Igual que cotizarEstadia, leyendo las temporadas del hotel desde la BD. */
export function cotizarParaHotel(hotelId, precioBase, entrada, salida) {
  return cotizarEstadia(precioBase, entrada, salida, temporadasRepositorio.aplicables(hotelId, entrada, salida))
}

/**
 * Política de cancelación: gratis hasta N días antes de la llegada (por defecto 2, o sea 48 horas).
 * Después se cobra una noche (el promedio por noche de la estadía, con IVA).
 */
export function politicaCancelacion(reserva, hoy = hoyISO()) {
  const gratisHasta = sumarDias(reserva.entrada, -config.reservas.cancelacionGratisDias)
  const cargoTardio = Math.round((reserva.subtotal / reserva.noches) * (1 + config.reservas.impuestosPorcentaje))
  const esGratis = hoy <= gratisHasta
  return {
    gratisHasta,
    diasDeAnticipacion: config.reservas.cancelacionGratisDias,
    cargoTardio,
    cargoSiCancelaHoy: esGratis ? 0 : cargoTardio,
  }
}
