import { useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'
import { hoyLocal, sumarDias } from '../utils/fechas.js'
import { cotizarEstadia } from '../utils/tarifas.js'
import { OPCIONES_HUESPEDES } from './SearchBar.jsx'
import Dialogo, { cerrarDialogo } from './Dialogo.jsx'

const formatoCop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const cop = (valor) => formatoCop.format(valor)

async function cargarHotelYTemporadas(hotelId) {
  const hoy = hoyLocal()
  // Desde 30 días atrás (un huésped en casa pudo llegar hace hasta 30 noches) hasta donde se puede reservar;
  // el backend acepta como máximo 400 días por consulta.
  const [hotel, calendario] = await Promise.all([api.hoteles.obtener(hotelId), api.hoteles.calendario(hotelId, sumarDias(hoy, -30), sumarDias(hoy, 369))])
  return { hotel, temporadas: calendario.temporadas }
}

/**
 * Cuadro para que recepción o el admin cambien o cancelen una reserva. Lo que se guarda lo decide
 * el backend (disponibilidad, precio, reglas del check-in); aquí solo se muestra una vista previa.
 */
export default function ModificarReserva({ reserva, onCerrar, onGuardada }) {
  const { configuracion } = useCatalogo()
  const { fechaHora } = useIdioma()
  const { datos, error: errorCarga } = useConsulta(`modificar:${reserva.hotelId}`, () => cargarHotelYTemporadas(reserva.hotelId))
  const enCasa = reserva.estado === 'check-in'

  const [habitacionId, setHabitacionId] = useState(reserva.habitacionId)
  const [entrada, setEntrada] = useState(reserva.entrada)
  const [salida, setSalida] = useState(reserva.salida)
  const [huespedes, setHuespedes] = useState(String(reserva.huespedes))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cancelar, setCancelar] = useState(false)
  const [exonerar, setExonerar] = useState(false)

  const habitacion = datos?.hotel.habitaciones.find((h) => h.id === habitacionId)
  const fechasValidas = entrada && salida && salida > entrada
  // Misma habitación → precio base acordado al reservar. Otra → su precio actual. Cada noche, con su temporada.
  const precioBase = habitacionId === reserva.habitacionId ? reserva.precioNoche : habitacion?.precio
  const nuevo = fechasValidas && precioBase && datos ? cotizarEstadia(precioBase, entrada, salida, datos.temporadas, configuracion) : null
  const cargo = reserva.cancelacion?.cargoSiCancelaHoy ?? 0

  async function guardar(evento) {
    evento.preventDefault()
    setError('')
    setEnviando(true)
    try {
      if (cancelar) await api.reservas.cancelar(reserva.id, exonerar)
      else await api.reservas.modificar(reserva.id, { habitacionId, entrada, salida, huespedes: Number(huespedes) })
      onGuardada()
    } catch (err) {
      setError(err.detalles?.[0]?.mensaje ?? err.message)
      setEnviando(false)
    }
  }

  const ultima = reserva.modificaciones?.at(-1)

  return (
    <Dialogo
      titulo={cancelar ? 'Cancelar reserva' : 'Modificar reserva'}
      etiqueta={`Reserva ${reserva.codigo}`}
      subtitulo={`${reserva.huespedNombre} · ${reserva.hotelNombre}`}
      onCerrar={onCerrar}
    >
      <form className="form-hotel" onSubmit={guardar}>
        {errorCarga && (
          <p className="pagina-login__error" role="alert">
            No se pudieron cargar las habitaciones del hotel: {errorCarga.message}
          </p>
        )}
        {enCasa && <p className="dialogo__aviso">El huésped ya hizo check-in: solo se pueden cambiar la fecha de salida y los huéspedes.</p>}

        {!cancelar && (
          <>
            <div className="form-hotel__grid">
              <label className="form-hotel__ancho-completo">
                Habitación
                <select value={habitacionId} onChange={(e) => setHabitacionId(e.target.value)} disabled={enCasa || !datos}>
                  {(datos?.hotel.habitaciones ?? [{ id: reserva.habitacionId, nombre: reserva.habitacionNombre }]).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.capacidad ? `${h.nombre} · hasta ${h.capacidad} huéspedes · ${cop(h.precio)}/noche` : h.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Llegada
                <input
                  type="date"
                  value={entrada}
                  min={entrada < hoyLocal() ? entrada : hoyLocal()}
                  onChange={(e) => setEntrada(e.target.value)}
                  disabled={enCasa}
                  required
                />
              </label>
              <label>
                Salida
                <input type="date" value={salida} min={entrada} onChange={(e) => setSalida(e.target.value)} required />
              </label>
              <label>
                Huéspedes
                <select value={huespedes} onChange={(e) => setHuespedes(e.target.value)}>
                  {OPCIONES_HUESPEDES.map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'huésped' : 'huéspedes'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="dialogo__comparacion" aria-live="polite">
              <div>
                <span>Total actual</span>
                <strong>{cop(reserva.total)}</strong>
                <small>
                  {reserva.noches} {reserva.noches === 1 ? 'noche' : 'noches'}
                </small>
              </div>
              <div>
                <span>Nuevo total</span>
                <strong>{nuevo ? cop(nuevo.total) : '—'}</strong>
                <small>
                  {nuevo
                    ? `${nuevo.noches} ${nuevo.noches === 1 ? 'noche' : 'noches'} · base ${cop(precioBase)}/noche${nuevo.detalleNoches.some((n) => n.temporada) ? ' · con temporada' : ''}`
                    : 'Revisa las fechas'}
                </small>
              </div>
            </div>

            {ultima && (
              <p className="dialogo__historial">
                Última modificación: {fechaHora(ultima.fecha)} por {ultima.por} ({ultima.detalle})
              </p>
            )}
          </>
        )}

        {reserva.estado === 'confirmada' && (
          <div className="dialogo__cancelar">
            <label className="form-hotel__casilla">
              <input type="checkbox" checked={cancelar} onChange={(e) => setCancelar(e.target.checked)} />
              Cancelar esta reserva
            </label>
            {cancelar && (
              <>
                <p className={cargo ? 'dialogo__aviso' : 'dialogo__nota'}>
                  {cargo
                    ? `Se cancela fuera del plazo gratuito: según la política se cobra una noche (${cop(cargo)}).`
                    : 'Está dentro del plazo de cancelación gratuita: no tiene cargo.'}
                </p>
                {cargo > 0 && (
                  <label className="form-hotel__casilla">
                    <input type="checkbox" checked={exonerar} onChange={(e) => setExonerar(e.target.checked)} />
                    Exonerar el cargo (el hotel asume la cancelación)
                  </label>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <p className="pagina-login__error" role="alert">
            {error}
          </p>
        )}

        <div className="dialogo__acciones">
          <button type="button" className="btn btn--fantasma" onClick={cerrarDialogo}>
            Cerrar
          </button>
          <button type="submit" className={cancelar ? 'btn btn--oscuro' : 'btn btn--dorado'} disabled={enviando || (!cancelar && !datos)}>
            {enviando ? 'Guardando…' : cancelar ? 'Confirmar cancelación' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
