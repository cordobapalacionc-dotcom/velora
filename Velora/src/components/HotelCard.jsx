import { Link } from 'react-router-dom'
import Stars from './Stars.jsx'
import { formatCOP } from '../utils/currency.js'
import { IMAGEN_RESPALDO } from '../services/hotelesStore.js'

export default function HotelCard({ hotel, orientacion = 'vertical', entrada, salida, huespedes }) {
  const params = new URLSearchParams()
  if (entrada) params.set('entrada', entrada)
  if (salida) params.set('salida', salida)
  if (huespedes) params.set('huespedes', huespedes)
  const query = params.toString()

  return (
    <Link
      to={`/hotel/${hotel.id}${query ? `?${query}` : ''}`}
      className={`hotel-card hotel-card--${orientacion}`}
    >
      <div className="hotel-card__imagen">
        <img src={hotel.imagenes[0] || IMAGEN_RESPALDO} alt={hotel.nombre} loading="lazy" />
      </div>
      <div className="hotel-card__info">
        <div className="hotel-card__encabezado">
          <Stars calificacion={hotel.calificacion} />
          <span className="hotel-card__resenas">{hotel.numResenas} reseñas</span>
        </div>
        <h3 className="hotel-card__nombre">{hotel.nombre}</h3>
        <p className="hotel-card__ubicacion">{hotel.ubicacion}</p>
        {orientacion === 'horizontal' && (
          <p className="hotel-card__descripcion">{hotel.descripcionCorta}</p>
        )}
        <div className="hotel-card__precio">
          <span className="hotel-card__precio-valor">{formatCOP(hotel.precioNoche)}</span>
          <span className="hotel-card__precio-unidad">/ noche</span>
        </div>
      </div>
    </Link>
  )
}
