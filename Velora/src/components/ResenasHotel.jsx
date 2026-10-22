import { BadgeCheck, MessageSquareText } from 'lucide-react'
import Stars from './Stars.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'

/** Reseñas de huéspedes que se alojaron (verificadas por una reserva con check-out). */
export default function ResenasHotel({ hotelId }) {
  const { t, fecha } = useIdioma()
  const { datos } = useConsulta(`resenas:${hotelId}`, () => api.hoteles.resenas(hotelId, 6))

  return (
    <section className="tarjeta-seccion" aria-labelledby="titulo-resenas">
      <h2 id="titulo-resenas">{t('resenas.titulo')}</h2>
      {!datos ? null : datos.resenas.length === 0 ? (
        <p className="resenas__vacio icono-en-linea">
          <MessageSquareText size={16} aria-hidden="true" />
          {t('resenas.vacio')}
        </p>
      ) : (
        <ul className="resenas">
          {datos.resenas.map((r) => (
            <li key={r.id} className="resena">
              <div className="resena__encabezado">
                <Stars calificacion={r.calificacion} />
                <strong>{r.autor}</strong>
                <span className="resena__verificada icono-en-linea">
                  <BadgeCheck size={14} aria-hidden="true" />
                  {t('resenas.verificada', { mes: fecha(r.fechaEstadia, 'mes') })}
                </span>
              </div>
              {/* El comentario se muestra tal cual lo escribió el huésped (en su idioma). */}
              <p className="resena__texto">{r.comentario}</p>
            </li>
          ))}
        </ul>
      )}
      {datos?.total > datos?.resenas.length && <p className="resenas__total">{t('resenas.mostrando', { n: datos.resenas.length, total: datos.total })}</p>}
    </section>
  )
}
