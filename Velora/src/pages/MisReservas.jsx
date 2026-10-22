import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarDays, Info, Luggage, ShieldCheck, Star, Users } from 'lucide-react'
import Cargando, { ErrorCarga } from '../components/Cargando.jsx'
import Dialogo, { cerrarDialogo } from '../components/Dialogo.jsx'
import EntradaEstrellas from '../components/EntradaEstrellas.jsx'
import Imagen from '../components/Imagen.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'

async function cargarMisReservas() {
  const [reservas, hoteles] = await Promise.all([api.reservas.mias(), api.hoteles.listar()])
  // Más recientes primero.
  return { reservas: reservas.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)), hoteles }
}

function DialogoCancelar({ reserva, onCerrar, onCancelada }) {
  const { t, precio, fecha, mensajeError } = useIdioma()
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { cargoSiCancelaHoy, gratisHasta } = reserva.cancelacion

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await api.reservas.cancelar(reserva.id)
      onCancelada()
    } catch (err) {
      setError(err)
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo={t('misReservas.cancelarTitulo')} etiqueta={t('misReservas.codigo', { codigo: reserva.codigo })} subtitulo={reserva.hotelNombre} onCerrar={onCerrar}>
      <p className={cargoSiCancelaHoy ? 'dialogo__aviso' : 'dialogo__nota'}>
        {cargoSiCancelaHoy
          ? t('misReservas.conCargo', { cargo: precio(cargoSiCancelaHoy), fecha: fecha(gratisHasta) })
          : t('misReservas.sinCargo')}
      </p>
      {error && (
        <p className="pagina-login__error" role="alert">
          {mensajeError(error)}
        </p>
      )}
      <div className="dialogo__acciones">
        <button type="button" className="btn btn--fantasma" onClick={cerrarDialogo}>
          {t('misReservas.conservar')}
        </button>
        <button type="button" className="btn btn--oscuro" onClick={confirmar} disabled={enviando}>
          {enviando ? t('comun.enviando') : t('misReservas.confirmarCancelacion')}
        </button>
      </div>
    </Dialogo>
  )
}

const CRITERIOS = ['limpieza', 'ubicacion', 'calidadPrecio', 'atencion']

function DialogoResena({ reserva, onCerrar, onPublicada }) {
  const { t, mensajeError } = useIdioma()
  const [puntajes, setPuntajes] = useState({ calificacion: 0, limpieza: 0, ubicacion: 0, calidadPrecio: 0, atencion: 0 })
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function publicar(evento) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await api.resenas.crear({ reservaId: reserva.id, ...puntajes, comentario })
      onPublicada()
    } catch (err) {
      setError(err)
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo={t('resenas.escribirTitulo')} etiqueta={reserva.hotelNombre} subtitulo={t('resenas.escribirSubtitulo')} onCerrar={onCerrar}>
      <form className="form-resena" onSubmit={publicar}>
        <EntradaEstrellas
          etiqueta={t('resenas.general')}
          valor={puntajes.calificacion}
          onCambio={(n) => setPuntajes((p) => ({ ...p, calificacion: n }))}
        />
        <div className="form-resena__criterios">
          {CRITERIOS.map((c) => (
            <EntradaEstrellas key={c} etiqueta={t(`hotel.criterio.${c}`)} valor={puntajes[c]} onCambio={(n) => setPuntajes((p) => ({ ...p, [c]: n }))} />
          ))}
        </div>
        <label>
          {t('resenas.comentario')}
          <textarea
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            minLength={10}
            maxLength={1000}
            placeholder={t('resenas.comentarioPista')}
            required
          />
        </label>
        {error && (
          <p className="pagina-login__error" role="alert">
            {error.detalles?.[0]?.mensaje ?? mensajeError(error)}
          </p>
        )}
        <div className="dialogo__acciones">
          <button type="button" className="btn btn--fantasma" onClick={cerrarDialogo}>
            {t('comun.cancelar')}
          </button>
          <button type="submit" className="btn btn--dorado" disabled={enviando}>
            {enviando ? t('comun.enviando') : t('resenas.publicar')}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

export default function MisReservas() {
  const { t, precio, fecha } = useIdioma()
  const { datos, error, recargar } = useConsulta('mis-reservas', cargarMisReservas)
  const [cancelando, setCancelando] = useState(null)
  const [opinando, setOpinando] = useState(null)
  const [aviso, setAviso] = useState('')

  if (error) return <div className="pagina-mis-reservas"><ErrorCarga error={error} onReintentar={recargar} /></div>
  if (!datos) return <Cargando />

  const { reservas, hoteles } = datos
  const imagenDe = (hotelId) => hoteles.find((h) => h.id === hotelId)?.imagenes[0]
  const existeHotel = (hotelId) => hoteles.some((h) => h.id === hotelId)

  return (
    <div className="pagina-mis-reservas">
      <p className="seccion__etiqueta">{t('misReservas.etiqueta')}</p>
      <h1>{t('nav.misReservas')}</h1>
      {aviso && (
        <p className="aviso-exito" role="status">
          {aviso}
        </p>
      )}

      {reservas.length === 0 ? (
        <div className="estado-vacio">
          <span className="estado-vacio__icono" aria-hidden="true">
            <Luggage size={26} strokeWidth={1.5} />
          </span>
          <h2>{t('misReservas.vacioTitulo')}</h2>
          <p>{t('misReservas.vacioTexto')}</p>
          <Link to="/buscar" className="btn btn--dorado">
            {t('misReservas.explorar')}
          </Link>
        </div>
      ) : (
        <ul className="lista-reservas">
          {reservas.map((r) => {
            const ultimaModificacion = r.modificaciones.at(-1)
            return (
              <li key={r.id} className="tarjeta-reserva">
                <Imagen src={imagenDe(r.hotelId)} alt="" width={160} height={120} sizes="160px" />

                <div>
                  <span className={`etiqueta-estado etiqueta-estado--${r.estado}`}>{t(`estadoHuesped.${r.estado}`)}</span>
                  <h2>{existeHotel(r.hotelId) ? <Link to={`/hotel/${r.hotelId}`}>{r.hotelNombre}</Link> : r.hotelNombre}</h2>
                  <p className="tarjeta-reserva__habitacion">{r.habitacionNombre}</p>
                  <div className="tarjeta-reserva__datos">
                    <span className="icono-en-linea">
                      <CalendarDays size={15} aria-hidden="true" />
                      {fecha(r.entrada)} → {fecha(r.salida)} · {t('reserva.noches', { n: r.noches })}
                    </span>
                    <span className="icono-en-linea">
                      <Users size={15} aria-hidden="true" />
                      {t(r.huespedes === 1 ? 'comun.huesped' : 'comun.huespedes', { n: r.huespedes })}
                    </span>
                  </div>
                  {r.estado === 'confirmada' && (
                    <p className="tarjeta-reserva__politica icono-en-linea">
                      <ShieldCheck size={15} aria-hidden="true" />
                      {r.cancelacion.cargoSiCancelaHoy === 0
                        ? t('politica.gratisHasta', { fecha: fecha(r.cancelacion.gratisHasta) })
                        : t('misReservas.cancelarCuesta', { cargo: precio(r.cancelacion.cargoSiCancelaHoy) })}
                    </p>
                  )}
                  {ultimaModificacion && r.estado !== 'cancelada' && (
                    <p className="tarjeta-reserva__modificada icono-en-linea">
                      <Info size={15} aria-hidden="true" />
                      {t('misReservas.modificada', { fecha: fecha(ultimaModificacion.fecha.slice(0, 10)), detalle: ultimaModificacion.detalle })}
                    </p>
                  )}
                  {r.estado === 'cancelada' && r.cargoCancelacion > 0 && (
                    <p className="tarjeta-reserva__politica">{t('misReservas.cargoCobrado', { cargo: precio(r.cargoCancelacion) })}</p>
                  )}
                </div>

                <div className="tarjeta-reserva__acciones">
                  <span className="tarjeta-reserva__total">{precio(r.total)}</span>
                  <span className="tarjeta-reserva__codigo">{t('misReservas.codigo', { codigo: r.codigo })}</span>
                  {r.estado === 'confirmada' && (
                    <button type="button" className="tabla__accion tabla__accion--eliminar" onClick={() => setCancelando(r)}>
                      {t('misReservas.cancelar')}
                    </button>
                  )}
                  {r.estado === 'check-out' &&
                    (r.resenaId ? (
                      <span className="tarjeta-reserva__resena icono-en-linea">
                        <BadgeCheck size={15} aria-hidden="true" />
                        {t('resenas.publicada')}
                      </span>
                    ) : (
                      <button type="button" className="btn btn--fantasma tarjeta-reserva__boton icono-en-linea" onClick={() => setOpinando(r)}>
                        <Star size={15} aria-hidden="true" />
                        {t('resenas.escribir')}
                      </button>
                    ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {cancelando && (
        <DialogoCancelar
          reserva={cancelando}
          onCerrar={() => setCancelando(null)}
          onCancelada={() => {
            setCancelando(null)
            setAviso(t('misReservas.cancelada', { codigo: cancelando.codigo }))
            recargar()
          }}
        />
      )}
      {opinando && (
        <DialogoResena
          reserva={opinando}
          onCerrar={() => setOpinando(null)}
          onPublicada={() => {
            setOpinando(null)
            setAviso(t('resenas.gracias'))
            recargar()
          }}
        />
      )}
    </div>
  )
}
