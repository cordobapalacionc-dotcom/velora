export default function Stars({ calificacion }) {
  const llenas = Math.round(calificacion)
  return (
    <span className="stars" aria-label={`Calificación ${calificacion} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < llenas ? 'star star--llena' : 'star'}>
          ★
        </span>
      ))}
    </span>
  )
}
