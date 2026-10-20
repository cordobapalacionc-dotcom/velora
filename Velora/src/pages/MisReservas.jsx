import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Luggage, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { obtenerHotelPorId, IMAGEN_RESPALDO } from '../services/hotelesStore.js'
import { cancelarReserva, obtenerReservasDeHuesped } from '../services/reservasStore.js'
import { formatCOP } from '../utils/currency.js'

// Textos pensados para el huésped (recepción usa otros: "Por ingresar", "En casa"...).
const ESTADO_ETIQUETA = {
  confirmada: 'Confirmada',
  'check-in': 'Hospedado',
  'check-out': 'Finalizada',
  cancelada: 'Cancelada',
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const fecha = (iso) => formatoFecha.format(new Date(`${iso}T00:00:00Z`))

export default function MisReservas() {
  const { usuario } = useAuth()
  const [reservas, setReservas] = useState(() => obtenerReservasDeHuesped(usuario.correo))

  function manejarCancelar(reserva) {
    const confirmado = window.confirm(
      `¿Cancelar tu reserva ${reserva.codigo} en ${reserva.hotelNombre}? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return
    cancelarReserva(reserva.id)
    setReservas(obtenerReservasDeHuesped(usuario.correo))
  }

  return (
    <div className="pagina-mis-reservas">
      <p className="seccion__etiqueta">Tu cuenta</p>
      <h1>Mis reservas</h1>

      {reservas.length === 0 ? (
        <div className="estado-vacio">
          <span className="estado-vacio__icono" aria-hidden="true">
            <Luggage size={26} strokeWidth={1.5} />
          </span>
          <h2>Aún no tienes reservas</h2>
          <p>Cuando reserves una habitación, aquí verás sus fechas, su código y su estado.</p>
          <Link to="/buscar" className="btn btn--dorado">
            Explorar hoteles
          </Link>
        </div>
      ) : (
        <ul className="lista-reservas">
          {reservas.map((r) => {
            const hotel = obtenerHotelPorId(r.hotelId)
            return (
              <li key={r.id} className="tarjeta-reserva">
                <img src={hotel?.imagenes[0] || IMAGEN_RESPALDO} alt="" width={160} height={120} loading="lazy" />

                <div>
                  <span className={`etiqueta-estado etiqueta-estado--${r.estado}`}>
                    {ESTADO_ETIQUETA[r.estado] ?? r.estado}
                  </span>
                  <h2>
                    {hotel ? <Link to={`/hotel/${r.hotelId}`}>{r.hotelNombre}</Link> : r.hotelNombre}
                  </h2>
                  <p className="tarjeta-reserva__habitacion">{r.habitacionNombre}</p>
                  <div className="tarjeta-reserva__datos">
                    <span className="icono-en-linea">
                      <CalendarDays size={15} aria-hidden="true" />
                      {fecha(r.entrada)} → {fecha(r.salida)} · {r.noches} {r.noches === 1 ? 'noche' : 'noches'}
                    </span>
                    <span className="icono-en-linea">
                      <Users size={15} aria-hidden="true" />
                      {r.huespedes} {Number(r.huespedes) === 1 ? 'huésped' : 'huéspedes'}
                    </span>
                  </div>
                </div>

                <div className="tarjeta-reserva__acciones">
                  <span className="tarjeta-reserva__total">{formatCOP(r.total)}</span>
                  <span className="tarjeta-reserva__codigo">Código {r.codigo}</span>
                  {r.estado === 'confirmada' && (
                    <button
                      type="button"
                      className="tabla__accion tabla__accion--eliminar"
                      onClick={() => manejarCancelar(r)}
                    >
                      Cancelar reserva
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
