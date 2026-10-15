import { randomInt } from 'node:crypto'

/** Convierte un nombre en un id tipo slug con sufijo aleatorio: "Suite Mar" -> "suite-mar-k3f9". */
export function generarSlug(nombre, prefijo) {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 60)
  const sufijo = randomInt(36 ** 4).toString(36).padStart(4, '0')
  return `${base || prefijo}-${sufijo}`
}

export function generarCodigoReserva() {
  return `VEL-${randomInt(100000, 1000000)}`
}
