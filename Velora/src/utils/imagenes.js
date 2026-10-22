// Imágenes adaptables: cada pantalla descarga solo el tamaño que necesita (un celular no baja
// una foto de 1600 px). Funciona con las fotos de Unsplash y con las que sube el admin.

export const IMAGEN_RESPALDO =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=450&q=70'

export const HERO_IMAGEN = 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=1600&h=900&q=70'

const ANCHOS_UNSPLASH = [400, 800, 1200, 1600]

/** Versiones de una foto de Unsplash: cambia w (y h en proporción) en la URL. */
function srcSetUnsplash(url) {
  const u = new URL(url)
  const w = Number(u.searchParams.get('w'))
  const h = Number(u.searchParams.get('h'))
  if (!w) return undefined
  return ANCHOS_UNSPLASH.filter((ancho) => ancho <= Math.max(w, 400))
    .map((ancho) => {
      u.searchParams.set('w', ancho)
      if (h) u.searchParams.set('h', Math.round((h * ancho) / w))
      return `${u.toString()} ${ancho}w`
    })
    .join(', ')
}

// El backend guarda cada imagen subida como <uuid>.webp (1600 px) + <uuid>-400.webp y <uuid>-800.webp.
const SUBIDA = /^(.*\/uploads\/[0-9a-f-]{36})\.webp$/

export function srcSet(url) {
  if (!url) return undefined
  try {
    if (new URL(url).hostname === 'images.unsplash.com') return srcSetUnsplash(url)
  } catch {
    return undefined
  }
  const subida = url.match(SUBIDA)
  if (subida) return `${subida[1]}-400.webp 400w, ${subida[1]}-800.webp 800w, ${url} 1600w`
  return undefined
}
