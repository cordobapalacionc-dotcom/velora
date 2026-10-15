import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Stars from '../components/Stars.jsx'
import HotelCard from '../components/HotelCard.jsx'
import { obtenerHotelPorId, hotelesSimilares, IMAGEN_RESPALDO } from '../services/hotelesStore.js'
import { crearReserva } from '../services/reservasStore.js'
import { formatCOP } from '../utils/currency.js'
import { useAuth } from '../context/AuthContext.jsx'

const TARIFA_LIMPIEZA = 180000
const IMPUESTOS_PORCENTAJE = 0.19

function calcularNoches(entrada, salida) {
  if (!entrada || !salida) return 1
  const ms = new Date(salida) - new Date(entrada)
  const noches = Math.round(ms / (1000 * 60 * 60 * 24))
  return noches > 0 ? noches : 1
}

export default function HotelDetail() {
  const { id } = useParams()
  const hotel = obtenerHotelPorId(id)
  const [searchParams] = useSearchParams()
  const navegar = useNavigate()
  const { estaAutenticado, usuario } = useAuth()

  const [entrada, setEntrada] = useState(searchParams.get('entrada') || '')
  const [salida, setSalida] = useState(searchParams.get('salida') || '')
  const [huespedes, setHuespedes] = useState(searchParams.get('huespedes') || '2')
  const huespedesNum = Number(huespedes) || 1

  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(() => {
    const conCapacidad = hotel?.habitaciones?.find((h) => (h.capacidad ?? 2) >= huespedesNum)
    return conCapacidad?.id ?? hotel?.habitaciones?.[0]?.id ?? null
  })
  const [reservaConfirmada, setReservaConfirmada] = useState(false)
  const [codigoReserva, setCodigoReserva] = useState('')
  const [errorReserva, setErrorReserva] = useState('')

  const habitacion = hotel?.habitaciones.find((h) => h.id === habitacionSeleccionada)
  const noches = calcularNoches(entrada, salida)

  let resumen = null
  if (habitacion) {
    const subtotal = habitacion.precio * noches
    const impuestos = Math.round(subtotal * IMPUESTOS_PORCENTAJE)
    const total = subtotal + impuestos + TARIFA_LIMPIEZA
    resumen = { subtotal, impuestos, total }
  }

  if (!hotel) {
    return (
      <div className="pagina-vacia">
        <h1>No encontramos esta propiedad</h1>
        <p>El hotel que buscas no existe o fue removido del catálogo.</p>
        <Link to="/buscar" className="btn btn--dorado">
          Ver todos los hoteles
        </Link>
      </div>
    )
  }

  function manejarReserva() {
    setErrorReserva('')
    if (!estaAutenticado) {
      navegar('/iniciar-sesion', { state: { desde: `/hotel/${hotel.id}` } })
      return
    }
    if (!entrada || !salida) {
      setErrorReserva('Selecciona la fecha de llegada y de salida antes de reservar.')
      return
    }
    if (salida <= entrada) {
      setErrorReserva('La fecha de salida debe ser posterior a la de llegada.')
      return
    }
    if (!habitacion || !resumen) return
    if ((habitacion.capacidad ?? 2) < huespedesNum) {
      setErrorReserva('La habitación seleccionada no tiene capacidad para esa cantidad de huéspedes.')
      return
    }

    const reserva = crearReserva({
      hotelId: hotel.id,
      hotelNombre: hotel.nombre,
      habitacionId: habitacion.id,
      habitacionNombre: habitacion.nombre,
      huespedNombre: usuario.nombre,
      huespedCorreo: usuario.correo,
      entrada,
      salida,
      huespedes,
      noches,
      subtotal: resumen.subtotal,
      impuestos: resumen.impuestos,
      tarifaLimpieza: TARIFA_LIMPIEZA,
      total: resumen.total,
    })
    setCodigoReserva(reserva.codigo)
    setReservaConfirmada(true)
  }

  return (
    <div className="pagina-hotel">
      <nav className="migas">
        <Link to="/">Inicio</Link> / <Link to="/buscar">Destinos</Link> / {hotel.nombre}
      </nav>

      <header className="pagina-hotel__encabezado">
        <div>
          <Stars calificacion={hotel.calificacion} />
          <span className="pagina-hotel__resenas"> {hotel.calificacion} · {hotel.numResenas} reseñas</span>
        </div>
        <h1>{hotel.nombre}</h1>
        <p className="pagina-hotel__ubicacion">📍 {hotel.ubicacion}</p>
      </header>

      <div className="galeria">
        <img
          className="galeria__principal"
          src={hotel.imagenes[0] || IMAGEN_RESPALDO}
          alt={hotel.nombre}
          width={1200}
          height={800}
          fetchPriority="high"
        />
        <div className="galeria__miniaturas">
          {hotel.imagenes.slice(1, 4).map((src, i) => (
            <img
              key={i}
              src={src || IMAGEN_RESPALDO}
              alt={`${hotel.nombre} vista ${i + 2}`}
              width={600}
              height={450}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      <div className="pagina-hotel__cuerpo">
        <main className="pagina-hotel__principal">
          <section className="tarjeta-seccion">
            <h2>El arte de la calma suspendida</h2>
            <p>{hotel.descripcion}</p>
          </section>

          <section className="tarjeta-seccion">
            <h2>Selecciona tu habitación o suite</h2>
            <div className="lista-habitaciones">
              {hotel.habitaciones.map((h) => {
                const capacidad = h.capacidad ?? 2
                const alcanza = capacidad >= huespedesNum
                return (
                  <div
                    key={h.id}
                    className={`opcion-habitacion ${habitacionSeleccionada === h.id ? 'opcion-habitacion--activa' : ''} ${!alcanza ? 'opcion-habitacion--deshabilitada' : ''}`}
                  >
                    <img
                      src={h.imagen || IMAGEN_RESPALDO}
                      alt={h.nombre}
                      width={300}
                      height={220}
                      loading="lazy"
                    />
                    <div className="opcion-habitacion__info">
                      <h3>
                        {h.nombre} {h.destacado && <span className="etiqueta-destacado">Más reservada</span>}
                      </h3>
                      <p>{h.detalle}</p>
                      <span className="opcion-habitacion__capacidad">👥 Hasta {capacidad} huéspedes</span>
                      <span className="opcion-habitacion__precio">{formatCOP(h.precio)} / noche</span>
                    </div>
                    {alcanza ? (
                      <button
                        type="button"
                        className={habitacionSeleccionada === h.id ? 'btn btn--dorado' : 'btn btn--oscuro'}
                        onClick={() => setHabitacionSeleccionada(h.id)}
                      >
                        {habitacionSeleccionada === h.id ? 'Seleccionada' : 'Seleccionar'}
                      </button>
                    ) : (
                      <span className="opcion-habitacion__aviso">No alcanza para {huespedesNum} huéspedes</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="tarjeta-seccion">
            <h2>Reputación</h2>
            <div className="reputacion">
              <div className="reputacion__promedio">
                <span className="reputacion__numero">{hotel.reputacion.promedio}</span>
                <Stars calificacion={hotel.reputacion.promedio} />
                <span>{hotel.reputacion.total} reseñas</span>
              </div>
              <div className="reputacion__barras">
                {[
                  ['Limpieza', hotel.reputacion.limpieza],
                  ['Ubicación', hotel.reputacion.ubicacion],
                  ['Relación calidad-precio', hotel.reputacion.cobertura],
                  ['Capacidad de respuesta', hotel.reputacion.respuesta],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="reputacion__barra">
                    <span>{etiqueta}</span>
                    <div className="reputacion__barra-fondo">
                      <div className="reputacion__barra-relleno" style={{ width: `${valor}%` }} />
                    </div>
                    <span>{valor}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <aside className="panel-reserva">
          <div className="panel-reserva__precio">
            <span className="panel-reserva__desde">Desde</span>
            <span className="panel-reserva__valor">{formatCOP(hotel.precioNoche)}</span>
            <span>/ noche</span>
          </div>

          <div className="panel-reserva__fechas">
            <label>
              <span>Llegada</span>
              <input
                type="date"
                value={entrada}
                onChange={(e) => {
                  setEntrada(e.target.value)
                  setErrorReserva('')
                }}
              />
            </label>
            <label>
              <span>Salida</span>
              <input
                type="date"
                value={salida}
                min={entrada || undefined}
                onChange={(e) => {
                  setSalida(e.target.value)
                  setErrorReserva('')
                }}
              />
            </label>
          </div>
          <div className="panel-reserva__huespedes">
            <label>
              <span>Huéspedes</span>
              <select
                value={huespedes}
                onChange={(e) => {
                  setHuespedes(e.target.value)
                  setErrorReserva('')
                }}
              >
                <option value="1">1 huésped</option>
                <option value="2">2 huéspedes</option>
                <option value="3">3 huéspedes</option>
                <option value="4">4 huéspedes</option>
                <option value="5">5 huéspedes</option>
                <option value="6">6 huéspedes</option>
              </select>
            </label>
          </div>

          {habitacion && resumen && (
            <div className="panel-reserva__resumen">
              <div className="panel-reserva__linea">
                <span>{habitacion.nombre}</span>
                <span>Habitación seleccionada</span>
              </div>
              <div className="panel-reserva__linea">
                <span>
                  {formatCOP(habitacion.precio)} x {noches} {noches === 1 ? 'noche' : 'noches'}
                </span>
                <span>{formatCOP(resumen.subtotal)}</span>
              </div>
              <div className="panel-reserva__linea">
                <span>Tarifa de limpieza</span>
                <span>{formatCOP(TARIFA_LIMPIEZA)}</span>
              </div>
              <div className="panel-reserva__linea">
                <span>Impuestos (IVA 19%)</span>
                <span>{formatCOP(resumen.impuestos)}</span>
              </div>
              <div className="panel-reserva__linea panel-reserva__linea--total">
                <span>Total</span>
                <span>{formatCOP(resumen.total)}</span>
              </div>
            </div>
          )}

          {reservaConfirmada ? (
            <p className="panel-reserva__confirmacion">
              ¡Reserva confirmada! Código <strong>{codigoReserva}</strong>. Preséntalo en recepción al
              llegar.
            </p>
          ) : (
            <>
              {errorReserva && <p className="pagina-login__error">{errorReserva}</p>}
              <button type="button" className="btn btn--dorado panel-reserva__boton" onClick={manejarReserva}>
                Proceder a reservar
              </button>
            </>
          )}
          {!estaAutenticado && !reservaConfirmada && (
            <p className="panel-reserva__nota">Necesitas iniciar sesión para completar tu reserva.</p>
          )}
        </aside>
      </div>

      <section className="seccion">
        <p className="seccion__etiqueta">También te puede interesar</p>
        <h2 className="seccion__titulo-centrado">Propiedades similares</h2>
        <div className="grid-similares">
          {hotelesSimilares(hotel.id).map((h) => (
            <HotelCard key={h.id} hotel={h} />
          ))}
        </div>
      </section>
    </div>
  )
}
