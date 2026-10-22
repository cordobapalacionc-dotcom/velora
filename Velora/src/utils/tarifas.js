import { nochesDeEstadia } from './fechas.js'

export const MAX_NOCHES = 30

/** La temporada que rige una noche: la de mayor recargo entre las que la incluyen (igual que el backend). */
export function temporadaDeLaNoche(fecha, temporadas = []) {
  let elegida = null
  for (const t of temporadas) {
    if (t.inicio <= fecha && fecha <= t.fin && (!elegida || t.recargo > elegida.recargo)) elegida = t
  }
  return elegida
}

/**
 * Misma fórmula que el backend (tarifas.servicio.js). Solo se usa para mostrar una vista previa
 * al modificar una reserva: el precio que vale es siempre el que calcula el servidor.
 */
export function cotizarEstadia(precioBase, entrada, salida, temporadas, { impuestosPorcentaje, tarifaLimpieza }) {
  const noches = nochesDeEstadia(entrada, salida).map((fecha) => {
    const temporada = temporadaDeLaNoche(fecha, temporadas)
    return { fecha, precio: Math.round(precioBase * (1 + (temporada?.recargo ?? 0) / 100)), temporada }
  })
  const subtotal = noches.reduce((suma, n) => suma + n.precio, 0)
  const impuestos = Math.round(subtotal * impuestosPorcentaje)
  return { noches: noches.length, detalleNoches: noches, subtotal, impuestos, tarifaLimpieza, total: subtotal + impuestos + tarifaLimpieza }
}
