import { Link } from 'react-router-dom'
import Imagen from './Imagen.jsx'
import Stars from './Stars.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'

export default function HotelCard({ hotel, orientacion = 'vertical', entrada, salida, huespedes }) {
  const { t, tr, precio } = useIdioma()
  const params = new URLSearchParams()
  if (entrada) params.set('entrada', entrada)
  if (salida) params.set('salida', salida)
  if (huespedes) params.set('huespedes', huespedes)
  const query = params.toString()

  return (
    <Link to={`/hotel/${hotel.id}${query ? `?${query}` : ''}`} className={`hotel-card hotel-card--${orientacion}`}>
      <div className="hotel-card__imagen">
        <Imagen
          src={hotel.imagenes[0]}
          alt={hotel.nombre}
          width={600}
          height={400}
          sizes={orientacion === 'horizontal' ? '(max-width: 720px) 100vw, 320px' : '(max-width: 720px) 100vw, 400px'}
        />
      </div>
      <div className="hotel-card__info">
        <div className="hotel-card__encabezado">
          <Stars calificacion={hotel.calificacion} />
          <span className="hotel-card__resenas">{t('hotel.resenas', { n: hotel.numResenas })}</span>
        </div>
        <h3 className="hotel-card__nombre">{hotel.nombre}</h3>
        <p className="hotel-card__ubicacion">{tr(hotel, 'ubicacion')}</p>
        {orientacion === 'horizontal' && <p className="hotel-card__descripcion">{tr(hotel, 'descripcionCorta')}</p>}
        <div className="hotel-card__precio">
          <span className="hotel-card__precio-valor">{precio(hotel.precioNoche)}</span>
          <span className="hotel-card__precio-unidad">{t('hotel.porNoche')}</span>
        </div>
      </div>
    </Link>
  )
}
