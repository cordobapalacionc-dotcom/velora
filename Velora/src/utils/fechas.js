// Fechas como texto AAAA-MM-DD. Los cálculos se hacen en UTC para evitar saltos por horario de verano.
const MS_POR_DIA = 86400000

/** Noches entre dos fechas AAAA-MM-DD. */
export function calcularNoches(entrada, salida) {
  return Math.round((Date.parse(`${salida}T00:00:00Z`) - Date.parse(`${entrada}T00:00:00Z`)) / MS_POR_DIA)
}

export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Fecha de hoy AAAA-MM-DD en la zona horaria del navegador (no UTC: en Colombia, después de las 7 p. m. UTC ya es mañana). */
export function hoyLocal() {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Cada noche de la estadía: [entrada, salida). */
export function nochesDeEstadia(entrada, salida) {
  return Array.from({ length: Math.max(0, calcularNoches(entrada, salida)) }, (_, i) => sumarDias(entrada, i))
}
