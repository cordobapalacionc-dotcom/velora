import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from '../../config/env.js'
import { errores } from '../../utils/errores.js'

// Firmas ("números mágicos") de los formatos permitidos. Se mira el contenido real del archivo,
// no la extensión ni el tipo que declara el navegador, que se pueden falsificar.
// SVG queda fuera a propósito: puede contener JavaScript.
const FORMATOS = [
  { extension: 'jpg', tipo: 'image/jpeg', coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    extension: 'png',
    tipo: 'image/png',
    coincide: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    extension: 'webp',
    tipo: 'image/webp',
    coincide: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
]

export function detectarFormato(buffer) {
  return FORMATOS.find((f) => buffer.length >= 12 && f.coincide(buffer)) ?? null
}

export const imagenesServicio = {
  /** Valida y guarda la imagen con un nombre aleatorio. Devuelve los datos para construir su URL. */
  async guardar(archivo) {
    if (!archivo) throw errores.solicitudInvalida('Adjunta una imagen en el campo "imagen".')

    const formato = detectarFormato(archivo.buffer)
    if (!formato) throw errores.solicitudInvalida('El archivo no es una imagen JPG, PNG o WebP válida.')

    // Nombre aleatorio: evita colisiones y que alguien elija la ruta donde se escribe el archivo.
    const nombre = `${randomUUID()}.${formato.extension}`
    await writeFile(join(config.imagenes.carpeta, nombre), archivo.buffer, { flag: 'wx' })

    return { nombre, tipo: formato.tipo, tamano: archivo.size }
  },
}
