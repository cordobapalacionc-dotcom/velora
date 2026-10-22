const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Noches entre dos fechas YYYY-MM-DD (calculado en UTC para evitar saltos por horario de verano). */
export function calcularNoches(entrada, salida) {
  return Math.round((Date.parse(`${salida}T00:00:00Z`) - Date.parse(`${entrada}T00:00:00Z`)) / MS_POR_DIA)
}

/** Suma (o resta, si es negativo) días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Fechas de cada noche de la estadía: [entrada, salida) → ['2026-01-10', '2026-01-11', ...]. */
export function nochesDeEstadia(entrada, salida) {
  return Array.from({ length: Math.max(0, calcularNoches(entrada, salida)) }, (_, i) => sumarDias(entrada, i))
}

/** Fecha de hoy como YYYY-MM-DD en la zona horaria del servidor. */
export function hoyISO() {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function ahoraISO() {
  return new Date().toISOString()
}
