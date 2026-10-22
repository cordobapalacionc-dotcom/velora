import { IMAGEN_RESPALDO, srcSet } from '../utils/imagenes.js'

/**
 * <img> con srcset, carga diferida y decodificación asíncrona por defecto.
 * `sizes` le dice al navegador qué ancho ocupará la imagen en pantalla.
 */
export default function Imagen({ src, sizes = '100vw', alt = '', prioridad = false, ...resto }) {
  const origen = src || IMAGEN_RESPALDO
  return (
    <img
      src={origen}
      srcSet={srcSet(origen)}
      sizes={srcSet(origen) ? sizes : undefined}
      alt={alt}
      loading={prioridad ? 'eager' : 'lazy'}
      fetchPriority={prioridad ? 'high' : undefined}
      decoding="async"
      {...resto}
    />
  )
}
