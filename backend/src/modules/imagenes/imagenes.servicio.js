import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
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

// Versiones que se guardan de cada imagen. La grande es la "oficial" (su URL es la que se guarda);
// las otras se piden con srcset para que un celular no descargue una foto de escritorio.
export const ANCHOS = [400, 800]
const ANCHO_MAXIMO = 1600
// Una imagen de 40 megapíxeles ya es más que una foto de cámara profesional: más que eso se rechaza
// (evita "bombas" de descompresión que agotan la memoria del servidor).
const MAX_PIXELES = 40_000_000

export function detectarFormato(buffer) {
  return FORMATOS.find((f) => buffer.length >= 12 && f.coincide(buffer)) ?? null
}

const aWebp = (entrada, ancho) =>
  sharp(entrada, { limitInputPixels: MAX_PIXELES })
    .rotate() // respeta la orientación con que se tomó la foto (EXIF) antes de quitar los metadatos
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer()

export const imagenesServicio = {
  /**
   * Valida la imagen, la convierte a WebP (sin metadatos como la ubicación GPS) y guarda
   * tres tamaños con un nombre aleatorio. Devuelve los datos para construir su URL.
   */
  async guardar(archivo) {
    if (!archivo) throw errores.solicitudInvalida('Adjunta una imagen en el campo "imagen".')

    const formato = detectarFormato(archivo.buffer)
    if (!formato) throw errores.solicitudInvalida('El archivo no es una imagen JPG, PNG o WebP válida.')

    let versiones
    try {
      versiones = await Promise.all([ANCHO_MAXIMO, ...ANCHOS].map((ancho) => aWebp(archivo.buffer, ancho)))
    } catch {
      // La firma era correcta pero el contenido está dañado (o es demasiado grande para procesarlo).
      throw errores.solicitudInvalida('No pudimos leer la imagen: puede estar dañada o ser demasiado grande.')
    }

    // Nombre aleatorio: evita colisiones y que alguien elija la ruta donde se escribe el archivo.
    const base = randomUUID()
    const [principal, ...pequenas] = versiones
    await writeFile(join(config.imagenes.carpeta, `${base}.webp`), principal, { flag: 'wx' })
    await Promise.all(
      pequenas.map((buffer, i) => writeFile(join(config.imagenes.carpeta, `${base}-${ANCHOS[i]}.webp`), buffer, { flag: 'wx' }))
    )

    const { width: ancho, height: alto } = await sharp(principal).metadata()
    return { nombre: `${base}.webp`, tipo: 'image/webp', tamano: principal.length, tamanoOriginal: archivo.size, ancho, alto }
  },
}
