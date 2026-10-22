import { obtenerDb } from '../../db/conexion.js'
import { calcularNoches, nochesDeEstadia } from '../../utils/fechas.js'

// Hasta dos meses se agrupa por día; con rangos más largos, por mes.
const MAX_DIAS_POR_DIA = 62

const claveMes = (fecha) => fecha.slice(0, 7)

/** Días (o meses) del periodo [desde, hasta), en orden, para que la gráfica muestre también los vacíos. */
function periodos(desde, hasta, porMes) {
  const dias = nochesDeEstadia(desde, hasta)
  return porMes ? [...new Set(dias.map(claveMes))] : dias
}

/**
 * Indicadores del hotel en [desde, hasta):
 *  - ocupación: noches vendidas / noches disponibles (habitaciones actuales × días del periodo),
 *  - ingresos: el total de cada reserva repartido entre sus noches (se reconoce al alojarse),
 *    más los cargos por cancelación tardía cobrados en el periodo,
 *  - tarifa promedio por noche (ADR) y RevPAR: ingreso de habitación por noche vendida / disponible,
 *  - cancelaciones de reservas creadas en el periodo.
 */
export function calcularMetricas(desde, hasta) {
  const db = obtenerDb()
  const diasPeriodo = calcularNoches(desde, hasta)
  const porMes = diasPeriodo > MAX_DIAS_POR_DIA

  const hoteles = db
    .prepare(
      `SELECT h.id, h.nombre, COUNT(hab.id) AS habitaciones
       FROM hoteles h LEFT JOIN habitaciones hab ON hab.hotel_id = h.id
       GROUP BY h.id ORDER BY h.nombre`
    )
    .all()
  const totalHabitaciones = hoteles.reduce((s, h) => s + h.habitaciones, 0)

  // Reservas que ocupan alguna noche del periodo (las canceladas no ocupan).
  const reservas = db
    .prepare(
      `SELECT hotel_id AS hotelId, entrada, salida, noches, subtotal, total FROM reservas
       WHERE estado IN ('confirmada', 'check-in', 'check-out') AND entrada < ? AND salida > ?`
    )
    .all(hasta, desde)

  const serie = new Map(periodos(desde, hasta, porMes).map((p) => [p, { periodo: p, ingresos: 0, nochesVendidas: 0 }]))
  const porHotel = new Map(hoteles.map((h) => [h.id, { ...h, ingresos: 0, nochesVendidas: 0 }]))
  let ingresosHabitacion = 0

  for (const r of reservas) {
    const totalPorNoche = r.total / r.noches
    const subtotalPorNoche = r.subtotal / r.noches
    for (const noche of nochesDeEstadia(r.entrada, r.salida)) {
      if (noche < desde || noche >= hasta) continue
      const punto = serie.get(porMes ? claveMes(noche) : noche)
      punto.ingresos += totalPorNoche
      punto.nochesVendidas += 1
      const hotel = porHotel.get(r.hotelId)
      if (hotel) {
        hotel.ingresos += totalPorNoche
        hotel.nochesVendidas += 1
      }
      ingresosHabitacion += subtotalPorNoche
    }
  }

  const cancelaciones = db
    .prepare(
      `SELECT COUNT(*) AS creadas, COALESCE(SUM(estado = 'cancelada'), 0) AS canceladas
       FROM reservas WHERE date(fecha_creacion, 'localtime') >= ? AND date(fecha_creacion, 'localtime') < ?`
    )
    .get(desde, hasta)
  const { cargos } = db
    .prepare(
      `SELECT COALESCE(SUM(cargo_cancelacion), 0) AS cargos FROM reservas
       WHERE estado = 'cancelada' AND date(fecha_cancelacion, 'localtime') >= ? AND date(fecha_cancelacion, 'localtime') < ?`
    )
    .get(desde, hasta)

  // Noches disponibles de cada punto de la serie: habitaciones × días que caen en ese día o mes.
  const diasPorPeriodo = new Map()
  for (const dia of nochesDeEstadia(desde, hasta)) {
    const clave = porMes ? claveMes(dia) : dia
    diasPorPeriodo.set(clave, (diasPorPeriodo.get(clave) ?? 0) + 1)
  }

  const nochesVendidas = [...serie.values()].reduce((s, p) => s + p.nochesVendidas, 0)
  const nochesDisponibles = totalHabitaciones * diasPeriodo
  const ingresosEstadias = [...serie.values()].reduce((s, p) => s + p.ingresos, 0)
  const proporcion = (parte, todo) => (todo ? parte / todo : 0)

  return {
    desde,
    hasta,
    agrupacion: porMes ? 'mes' : 'dia',
    resumen: {
      ocupacion: proporcion(nochesVendidas, nochesDisponibles),
      ingresos: Math.round(ingresosEstadias + cargos),
      cargosCancelacion: cargos,
      tarifaPromedio: Math.round(proporcion(ingresosHabitacion, nochesVendidas)),
      revpar: Math.round(proporcion(ingresosHabitacion, nochesDisponibles)),
      nochesVendidas,
      nochesDisponibles,
      reservasCreadas: cancelaciones.creadas,
      cancelaciones: cancelaciones.canceladas,
      tasaCancelacion: proporcion(cancelaciones.canceladas, cancelaciones.creadas),
    },
    serie: [...serie.values()].map((p) => ({
      periodo: p.periodo,
      ingresos: Math.round(p.ingresos),
      nochesVendidas: p.nochesVendidas,
      ocupacion: proporcion(p.nochesVendidas, totalHabitaciones * diasPorPeriodo.get(p.periodo)),
    })),
    porHotel: [...porHotel.values()]
      .map((h) => ({
        hotelId: h.id,
        nombre: h.nombre,
        habitaciones: h.habitaciones,
        ingresos: Math.round(h.ingresos),
        nochesVendidas: h.nochesVendidas,
        ocupacion: proporcion(h.nochesVendidas, h.habitaciones * diasPeriodo),
      }))
      .sort((a, b) => b.ingresos - a.ingresos),
  }
}
