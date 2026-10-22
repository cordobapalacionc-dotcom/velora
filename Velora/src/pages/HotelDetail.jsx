import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarX2, Check, MapPin, ShieldCheck, Users } from 'lucide-react'
import CalendarioDisponibilidad from '../components/CalendarioDisponibilidad.jsx'
import Cargando, { ErrorCarga } from '../components/Cargando.jsx'
import HotelCard from '../components/HotelCard.jsx'
import Imagen from '../components/Imagen.jsx'
import ResenasHotel from '../components/ResenasHotel.jsx'
import { OPCIONES_HUESPEDES } from '../components/SearchBar.jsx'
import Stars from '../components/Stars.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'
import { calcularNoches, hoyLocal, nochesDeEstadia, sumarDias } from '../utils/fechas.js'

// El calendario cubre lo que se puede reservar: hasta un año de anticipación (+ la estadía máxima).
const DIAS_CALENDARIO = 396

/** Agrupa noches seguidas con el mismo precio y temporada: "2 noches × $X (Temporada alta +30 %)". */
function agruparNoches(detalleNoches) {
  const grupos = []
  for (const noche of detalleNoches) {
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo.precio === noche.precio && ultimo.temporada?.nombre === noche.temporada?.nombre) ultimo.cantidad += 1
    else grupos.push({ precio: noche.precio, temporada: noche.temporada, cantidad: 1 })
  }
  return grupos
}

function PanelReserva({ hotel, calendario, entrada, salida, huespedes, habitacion, onCambioFechas, onCambioHuespedes, onReservada }) {
  const { estaAutenticado, usuario } = useAuth()
  const { configuracion } = useCatalogo()
  const { t, tr, precio, fecha, moneda, idioma, mensajeError } = useIdioma()
  const navegar = useNavigate()
  const [confirmada, setConfirmada] = useState(null)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const fechasValidas = Boolean(entrada && salida && salida > entrada)
  const consulta = { habitacionId: habitacion?.id, entrada, salida, huespedes }
  const claveCotizacion = fechasValidas && habitacion ? `cotizacion:${hotel.id}:${JSON.stringify(consulta)}:${calendario.version}` : null
  const { datos: cotizacion, error: errorCotizacion, cargando } = useConsulta(claveCotizacion, () => api.hoteles.cotizacion(hotel.id, consulta))

  async function reservar() {
    setError(null)
    if (!estaAutenticado) {
      const vuelta = `/hotel/${hotel.id}?${new URLSearchParams({ entrada, salida, huespedes }).toString()}`
      navegar('/iniciar-sesion', { state: { desde: vuelta } })
      return
    }
    setEnviando(true)
    try {
      const reserva = await api.reservas.crear({ hotelId: hotel.id, habitacionId: habitacion.id, entrada, salida, huespedes: Number(huespedes) })
      setConfirmada(reserva)
      onReservada(habitacion.id)
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  const politica = cotizacion?.cancelacion
  const noDisponible = cotizacion && !cotizacion.disponible

  return (
    <aside className="panel-reserva" aria-label={t('reserva.panel')}>
      <div className="panel-reserva__precio">
        <span className="panel-reserva__desde">{t('reserva.desde')}</span>
        <span className="panel-reserva__valor">{precio(hotel.precioNoche)}</span>
        <span>{t('hotel.porNoche')}</span>
      </div>

      <div className="panel-reserva__fechas">
        <label>
          <span>{t('buscar.llegada')}</span>
          <input
            type="date"
            value={entrada}
            min={hoyLocal()}
            onChange={(e) => onCambioFechas({ entrada: e.target.value, salida: salida > e.target.value ? salida : '' })}
          />
        </label>
        <label>
          <span>{t('buscar.salida')}</span>
          <input
            type="date"
            value={salida}
            min={entrada ? sumarDias(entrada, 1) : hoyLocal()}
            onChange={(e) => onCambioFechas({ entrada, salida: e.target.value })}
          />
        </label>
      </div>
      <div className="panel-reserva__huespedes">
        <label>
          <span>{t('buscar.huespedes')}</span>
          <select value={huespedes} onChange={(e) => onCambioHuespedes(e.target.value)}>
            {OPCIONES_HUESPEDES.map((n) => (
              <option key={n} value={n}>
                {t(n === 1 ? 'comun.huesped' : 'comun.huespedes', { n })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!fechasValidas && (
        <p className="panel-reserva__pista">{entrada && salida ? t('reserva.salidaPosterior') : t('reserva.eligeFechas')}</p>
      )}

      {fechasValidas && habitacion && (
        <div className="panel-reserva__resumen" aria-live="polite" aria-busy={cargando}>
          <div className="panel-reserva__linea">
            <span>{tr(habitacion, 'nombre')}</span>
            <span>{t('reserva.noches', { n: calcularNoches(entrada, salida) })}</span>
          </div>
          {errorCotizacion && <p className="pagina-login__error">{mensajeError(errorCotizacion)}</p>}
          {cotizacion && (
            <>
              {agruparNoches(cotizacion.detalleNoches).map((g, i) => (
                <div key={i} className="panel-reserva__linea">
                  <span>
                    {t(g.cantidad === 1 ? 'reserva.nocheX' : 'reserva.nochesX', { n: g.cantidad, precio: precio(g.precio) })}
                    {g.temporada && (
                      <small className={`panel-reserva__temporada ${g.temporada.recargo > 0 ? 'panel-reserva__temporada--alta' : 'panel-reserva__temporada--baja'}`}>
                        {g.temporada.nombre} ({g.temporada.recargo > 0 ? '+' : ''}
                        {g.temporada.recargo} %)
                      </small>
                    )}
                  </span>
                  <span>{precio(g.precio * g.cantidad)}</span>
                </div>
              ))}
              <div className="panel-reserva__linea">
                <span>{t('reserva.limpieza')}</span>
                <span>{precio(cotizacion.tarifaLimpieza)}</span>
              </div>
              <div className="panel-reserva__linea">
                <span>{t('reserva.impuestos', { porcentaje: Math.round(configuracion.impuestosPorcentaje * 100) })}</span>
                <span>{precio(cotizacion.impuestos)}</span>
              </div>
              <div className="panel-reserva__linea panel-reserva__linea--total">
                <span>{t('reserva.total')}</span>
                <span>{precio(cotizacion.total)}</span>
              </div>
              {moneda === 'USD' && <p className="panel-reserva__nota">{t('reserva.seCobraEnCop', { total: precio(cotizacion.total, { forzarCop: true }) })}</p>}
            </>
          )}
        </div>
      )}

      {politica && !noDisponible && !confirmada && (
        <p className="panel-reserva__politica icono-en-linea">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            {politica.cargoSiCancelaHoy === 0
              ? t('politica.gratisHasta', { fecha: fecha(politica.gratisHasta) })
              : t('politica.sinGratis', { horas: politica.diasDeAnticipacion * 24, cargo: precio(politica.cargoTardio) })}{' '}
            <Link to="/politicas#cancelacion">{t('politica.verPolitica')}</Link>
          </span>
        </p>
      )}

      {noDisponible && !confirmada && (
        <p className="pagina-login__error icono-en-linea" role="alert">
          <CalendarX2 size={16} aria-hidden="true" />
          {cotizacion.motivo === 'ocupada' ? t('reserva.ocupadaEnFechas') : t('reserva.capacidad', { n: habitacion.capacidad })}
        </p>
      )}

      {confirmada ? (
        <div className="panel-reserva__confirmacion" role="status">
          <p>
            {t('reserva.confirmada')} <strong>{confirmada.codigo}</strong>. {t('reserva.presentaCodigo')}
          </p>
          <p>{t('reserva.correoEnviado', { correo: confirmada.huespedCorreo })}</p>
          {usuario?.rol === 'cliente' && <Link to="/mis-reservas">{t('reserva.verMisReservas')}</Link>}
          <button type="button" className="enlace-boton" onClick={() => setConfirmada(null)}>
            {t('reserva.otra')}
          </button>
        </div>
      ) : (
        <>
          {error && (
            <p className="pagina-login__error" role="alert">
              {/* En español el mensaje del servidor dice qué fechas están ocupadas; en inglés, uno genérico. */}
              {idioma === 'en' && error.estado === 409 ? t('reserva.yaOcupada') : mensajeError(error)}
            </p>
          )}
          <button
            type="button"
            className="btn btn--dorado panel-reserva__boton"
            onClick={reservar}
            disabled={!fechasValidas || !cotizacion || noDisponible || enviando}
          >
            {enviando ? t('reserva.reservando') : estaAutenticado ? t('reserva.boton') : t('reserva.botonSinSesion')}
          </button>
        </>
      )}
      {!estaAutenticado && !confirmada && <p className="panel-reserva__nota">{t('reserva.necesitasSesion')}</p>}
    </aside>
  )
}

export default function HotelDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { t, tr, precio } = useIdioma()
  const hoy = hoyLocal()

  const { datos: hotel, error, recargar } = useConsulta(`hotel:${id}`, () => api.hoteles.obtener(id))
  const { datos: similares } = useConsulta(`similares:${id}`, () => api.hoteles.similares(id))
  const [versionCalendario, setVersionCalendario] = useState(0)
  const { datos: calendario } = useConsulta(`calendario:${id}:${versionCalendario}`, () =>
    api.hoteles.calendario(id, hoy, sumarDias(hoy, DIAS_CALENDARIO))
  )

  const [entrada, setEntrada] = useState(() => {
    const valor = searchParams.get('entrada') ?? ''
    return valor >= hoy ? valor : ''
  })
  const [salida, setSalida] = useState(() => {
    const valor = searchParams.get('salida') ?? ''
    return valor > entrada && entrada ? valor : ''
  })
  const [huespedes, setHuespedes] = useState(searchParams.get('huespedes') || '2')
  const [habitacionElegida, setHabitacionElegida] = useState(null)
  const huespedesNum = Number(huespedes) || 1

  if (error) {
    return error.estado === 404 ? (
      <div className="pagina-vacia">
        <h1>{t('hotel.noExiste')}</h1>
        <p>{t('hotel.noExisteTexto')}</p>
        <Link to="/buscar" className="btn btn--dorado">
          {t('resultados.verTodos')}
        </Link>
      </div>
    ) : (
      <div className="pagina-hotel">
        <ErrorCarga error={error} onReintentar={recargar} />
      </div>
    )
  }
  if (!hotel) return <Cargando />

  const ocupadasDe = (habitacionId) => calendario?.habitaciones.find((h) => h.id === habitacionId)?.ocupadas ?? []
  const libreEnFechas = (habitacionId) => {
    if (!entrada || !salida || salida <= entrada) return true
    const noches = new Set(ocupadasDe(habitacionId).flatMap((o) => nochesDeEstadia(o.entrada, o.salida)))
    return nochesDeEstadia(entrada, salida).every((n) => !noches.has(n))
  }
  // Por defecto, la primera habitación con capacidad suficiente y libre en las fechas elegidas.
  const habitacionId =
    habitacionElegida ??
    (hotel.habitaciones.find((h) => h.capacidad >= huespedesNum && libreEnFechas(h.id)) ?? hotel.habitaciones[0])?.id
  const habitacion = hotel.habitaciones.find((h) => h.id === habitacionId)

  function cambiarFechas(nuevas) {
    setEntrada(nuevas.entrada)
    setSalida(nuevas.salida)
  }

  const reputacion = [
    ['limpieza', hotel.reputacion.limpieza],
    ['ubicacion', hotel.reputacion.ubicacion],
    ['calidadPrecio', hotel.reputacion.cobertura],
    ['atencion', hotel.reputacion.respuesta],
  ]

  return (
    <div className="pagina-hotel">
      <nav className="migas" aria-label={t('hotel.migas')}>
        <Link to="/">{t('nav.inicio')}</Link> / <Link to="/buscar">{t('nav.hoteles')}</Link> / {hotel.nombre}
      </nav>

      <header className="pagina-hotel__encabezado">
        <div>
          <Stars calificacion={hotel.calificacion} />
          <span className="pagina-hotel__resenas">
            {' '}
            {hotel.calificacion} · {t('hotel.resenas', { n: hotel.numResenas })}
          </span>
        </div>
        <h1>{hotel.nombre}</h1>
        <p className="pagina-hotel__ubicacion icono-en-linea">
          <MapPin size={16} aria-hidden="true" />
          {tr(hotel, 'ubicacion')}
        </p>
      </header>

      <div className="galeria">
        <Imagen
          className="galeria__principal"
          src={hotel.imagenes[0]}
          alt={`${hotel.nombre}, ${tr(hotel, 'ubicacion')}`}
          width={1200}
          height={800}
          sizes="(max-width: 720px) 100vw, 66vw"
          prioridad
        />
        <div className="galeria__miniaturas">
          {hotel.imagenes.slice(1, 4).map((src, i) => (
            <Imagen
              key={src}
              src={src}
              alt={t('hotel.foto', { n: i + 2, total: hotel.imagenes.length, nombre: hotel.nombre })}
              width={600}
              height={450}
              sizes="(max-width: 720px) 33vw, 22vw"
            />
          ))}
        </div>
      </div>

      <div className="pagina-hotel__cuerpo">
        <div className="pagina-hotel__principal">
          <section className="tarjeta-seccion">
            <h2>{t('hotel.sobre')}</h2>
            <p>{tr(hotel, 'descripcion')}</p>
          </section>

          <section className="tarjeta-seccion">
            <h2>{t('hotel.eligeHabitacion')}</h2>
            <div className="lista-habitaciones">
              {hotel.habitaciones.map((h) => {
                const alcanza = h.capacidad >= huespedesNum
                const libre = libreEnFechas(h.id)
                const activa = habitacionId === h.id
                return (
                  <div
                    key={h.id}
                    className={`opcion-habitacion ${activa ? 'opcion-habitacion--activa' : ''} ${!alcanza ? 'opcion-habitacion--deshabilitada' : ''}`}
                  >
                    <Imagen src={h.imagen} alt={tr(h, 'nombre')} width={300} height={220} sizes="(max-width: 720px) 100vw, 160px" />
                    <div className="opcion-habitacion__info">
                      <h3>
                        {tr(h, 'nombre')} {h.destacado && <span className="etiqueta-destacado">{t('hotel.masReservada')}</span>}
                      </h3>
                      <p>{tr(h, 'detalle')}</p>
                      <span className="opcion-habitacion__capacidad icono-en-linea">
                        <Users size={14} aria-hidden="true" />
                        {t('hotel.hastaHuespedes', { n: h.capacidad })}
                      </span>
                      <span className="opcion-habitacion__precio">
                        {precio(h.precio)} {t('hotel.porNoche')}
                      </span>
                      {!libre && <span className="opcion-habitacion__ocupada">{t('hotel.noDisponibleFechas')}</span>}
                    </div>
                    {alcanza ? (
                      <button
                        type="button"
                        className={activa ? 'btn btn--seleccionada' : 'btn btn--fantasma'}
                        aria-pressed={activa}
                        onClick={() => setHabitacionElegida(h.id)}
                      >
                        {activa && <Check size={16} aria-hidden="true" />}
                        {activa ? t('hotel.seleccionada') : t('hotel.seleccionar')}
                      </button>
                    ) : (
                      <span className="opcion-habitacion__aviso">{t('hotel.noAlcanza', { n: huespedesNum })}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="tarjeta-seccion" aria-labelledby="titulo-disponibilidad">
            <h2 id="titulo-disponibilidad">{t('hotel.disponibilidad', { habitacion: tr(habitacion, 'nombre') })}</h2>
            {calendario ? (
              <CalendarioDisponibilidad
                ocupadas={ocupadasDe(habitacionId)}
                temporadas={calendario.temporadas}
                entrada={entrada}
                salida={salida}
                onCambio={cambiarFechas}
                maximo={sumarDias(hoy, 365)}
              />
            ) : (
              <Cargando texto={t('calendario.cargando')} />
            )}
          </section>

          <section className="tarjeta-seccion">
            <h2>{t('hotel.reputacion')}</h2>
            <div className="reputacion">
              <div className="reputacion__promedio">
                <span className="reputacion__numero">{hotel.reputacion.promedio}</span>
                <Stars calificacion={hotel.reputacion.promedio} />
                <span>{t('hotel.resenas', { n: hotel.reputacion.total })}</span>
              </div>
              <div className="reputacion__barras">
                {reputacion.map(([clave, valor]) => (
                  <div key={clave} className="reputacion__barra">
                    <span>{t(`hotel.criterio.${clave}`)}</span>
                    <div className="reputacion__barra-fondo">
                      <div className="reputacion__barra-relleno" style={{ width: `${valor}%` }} />
                    </div>
                    <span>{valor}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <ResenasHotel hotelId={hotel.id} />
        </div>

        <PanelReserva
          hotel={hotel}
          calendario={{ version: versionCalendario }}
          entrada={entrada}
          salida={salida}
          huespedes={huespedes}
          habitacion={habitacion}
          onCambioFechas={cambiarFechas}
          onCambioHuespedes={setHuespedes}
          onReservada={(habitacionReservada) => {
            // La habitación reservada ya no está libre en esas fechas: se fija para que la selección automática no salte a otra.
            setHabitacionElegida(habitacionReservada)
            setVersionCalendario((v) => v + 1)
          }}
        />
      </div>

      {similares?.length > 0 && (
        <section className="seccion">
          <p className="seccion__etiqueta">{t('hotel.similaresEtiqueta')}</p>
          <h2 className="seccion__titulo-centrado">{t('hotel.similares')}</h2>
          <div className="grid-similares">
            {similares.map((h) => (
              <HotelCard key={h.id} hotel={h} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
