import { useId } from 'react'
import { useIdioma } from '../context/IdiomaContext.jsx'

/**
 * Puntaje de 1 a 5 con radios nativos (se puede elegir con flechas del teclado).
 * Visualmente son estrellas; para lectores de pantalla, "4 de 5".
 */
export default function EntradaEstrellas({ etiqueta, valor, onCambio }) {
  const { t } = useIdioma()
  const nombre = useId()
  return (
    <fieldset className="entrada-estrellas">
      <legend>{etiqueta}</legend>
      <div className="entrada-estrellas__opciones">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= valor ? 'entrada-estrellas__estrella entrada-estrellas__estrella--llena' : 'entrada-estrellas__estrella'}>
            <input type="radio" name={nombre} value={n} checked={valor === n} onChange={() => onCambio(n)} required />
            <span aria-hidden="true">★</span>
            <span className="solo-lector">{t('resenas.puntaje', { n })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
