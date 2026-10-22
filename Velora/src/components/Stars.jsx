import { useIdioma } from '../context/IdiomaContext.jsx'

export default function Stars({ calificacion }) {
  const { t } = useIdioma()
  const llenas = Math.round(calificacion)
  return (
    <span className="stars" role="img" aria-label={t('hotel.calificacionDe5', { n: calificacion })}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < llenas ? 'star star--llena' : 'star'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}
