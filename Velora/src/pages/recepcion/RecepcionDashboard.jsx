import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Cargando, { ErrorCarga } from '../../components/Cargando.jsx'
import ModificarReserva from '../../components/ModificarReserva.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'
import { calcularNoches, hoyLocal } from '../../utils/fechas.js'

const ESTADO_ETIQUETA = {
  confirmada: 'Por ingresar',
  'check-in': 'En casa',
  'check-out': 'Finalizada',
  cancelada: 'Cancelada',
}

const coincide = (r, q) =>
  r.huespedNombre.toLowerCase().includes(q) || r.huespedCorreo.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q)

function TablaReservas({ reservas, vacio, fechaHoy, ocupada, onConfirmarEntrada, onConfirmarSalida, onModificar }) {
  return (
    <div className="tabla-envoltorio">
      <table className="tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Huésped</th>
            <th>Hotel</th>
            <th>Habitación</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Estado</th>
            <th>
              <span className="solo-lector">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reservas.length === 0 ? (
            <tr>
              <td colSpan={8} className="tabla__vacio">
                {vacio}
              </td>
            </tr>
          ) : (
            reservas.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.codigo}
                  {r.modificaciones.length > 0 && (
                    <>
                      <br />
                      <span className="tabla__subtexto">Modificada</span>
                    </>
                  )}
                </td>
                <td>
                  {r.huespedNombre}
                  <br />
                  <span className="tabla__subtexto">{r.huespedCorreo}</span>
                </td>
                <td>{r.hotelNombre}</td>
                <td>{r.habitacionNombre}</td>
                <td>{r.entrada}</td>
                <td>{r.salida}</td>
                <td>
                  <span className={`etiqueta-estado etiqueta-estado--${r.estado}`}>{ESTADO_ETIQUETA[r.estado] ?? r.estado}</span>
                </td>
                <td className="tabla__acciones">
                  {['confirmada', 'check-in'].includes(r.estado) && (
                    <button type="button" className="tabla__accion" onClick={() => onModificar(r)}>
                      Modificar
                    </button>
                  )}
                  {r.estado === 'confirmada' && r.entrada > fechaHoy && (
                    <span className="tabla__subtexto">
                      Llega en {calcularNoches(fechaHoy, r.entrada)} {calcularNoches(fechaHoy, r.entrada) === 1 ? 'día' : 'días'}
                    </span>
                  )}
                  {/* El check-in solo es posible desde el día de llegada (misma regla que el backend) */}
                  {r.estado === 'confirmada' && r.entrada <= fechaHoy && (
                    <button type="button" className="btn btn--dorado tabla__boton" disabled={ocupada === r.id} onClick={() => onConfirmarEntrada(r)}>
                      Confirmar entrada
                    </button>
                  )}
                  {r.estado === 'check-in' && (
                    <button type="button" className="btn btn--oscuro tabla__boton" disabled={ocupada === r.id} onClick={() => onConfirmarSalida(r)}>
                      Confirmar salida
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function RecepcionDashboard() {
  const [busqueda, setBusqueda] = useState('')
  const [reservaEditando, setReservaEditando] = useState(null)
  const [ocupada, setOcupada] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const { datos: todas, error, recargar, cargando } = useConsulta('recepcion:reservas', () => api.reservas.listar())
  const fechaHoy = hoyLocal()

  if (error && !todas) return <div className="pagina-dashboard"><ErrorCarga error={error} onReintentar={recargar} /></div>
  if (!todas) return <Cargando />

  const llegadasHoy = todas.filter((r) => r.entrada === fechaHoy && r.estado === 'confirmada')
  const salidasHoy = todas.filter((r) => r.salida === fechaHoy && r.estado === 'check-in')
  const enCasa = todas.filter((r) => r.estado === 'check-in')
  const proximasLlegadas = todas.filter((r) => r.entrada > fechaHoy && r.estado === 'confirmada').sort((a, b) => a.entrada.localeCompare(b.entrada))
  const q = busqueda.trim().toLowerCase()
  const resultadosBusqueda = q ? todas.filter((r) => coincide(r, q)) : []

  async function ejecutar(reserva, accion, exito) {
    setOcupada(reserva.id)
    setMensaje(null)
    try {
      await accion(reserva.id)
      setMensaje({ tipo: 'exito', texto: `${exito} · ${reserva.codigo} (${reserva.huespedNombre})` })
      recargar()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    } finally {
      setOcupada(null)
    }
  }

  const propsTabla = {
    fechaHoy,
    ocupada,
    onConfirmarEntrada: (r) => ejecutar(r, api.reservas.checkIn, 'Entrada confirmada'),
    onConfirmarSalida: (r) => ejecutar(r, api.reservas.checkOut, 'Salida confirmada'),
    onModificar: setReservaEditando,
  }

  return (
    <div className="pagina-dashboard">
      <header className="dashboard__encabezado">
        <div>
          <p className="seccion__etiqueta">Panel de recepción</p>
          <h1>Validación de entradas y salidas</h1>
        </div>
        <button type="button" className="tabla__accion icono-en-linea" onClick={recargar} disabled={cargando}>
          <RefreshCw size={14} aria-hidden="true" /> {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      {mensaje && (
        <p className={mensaje.tipo === 'exito' ? 'aviso-exito' : 'pagina-login__error'} role={mensaje.tipo === 'exito' ? 'status' : 'alert'}>
          {mensaje.texto}
        </p>
      )}

      <div className="dashboard__stats">
        <div className="dashboard__stat">
          <span>Llegadas de hoy</span>
          <strong>{llegadasHoy.length}</strong>
        </div>
        <div className="dashboard__stat">
          <span>Huéspedes en casa</span>
          <strong>{enCasa.length}</strong>
        </div>
        <div className="dashboard__stat">
          <span>Salidas de hoy</span>
          <strong>{salidasHoy.length}</strong>
        </div>
      </div>

      <section className="dashboard__seccion">
        <h2>Buscar reserva</h2>
        <input
          type="search"
          className="dashboard__buscador"
          placeholder="Buscar por nombre, correo o código de reserva..."
          aria-label="Buscar reserva por nombre, correo o código"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {q && <TablaReservas reservas={resultadosBusqueda} vacio="No encontramos reservas con ese criterio." {...propsTabla} />}
      </section>

      <section className="dashboard__seccion">
        <h2>Llegadas de hoy ({llegadasHoy.length})</h2>
        <TablaReservas reservas={llegadasHoy} vacio="No hay llegadas programadas para hoy." {...propsTabla} />
      </section>

      <section className="dashboard__seccion">
        <h2>Salidas de hoy ({salidasHoy.length})</h2>
        <TablaReservas reservas={salidasHoy} vacio="No hay salidas programadas para hoy." {...propsTabla} />
      </section>

      <section className="dashboard__seccion">
        <h2>Huéspedes en casa ({enCasa.length})</h2>
        <TablaReservas reservas={enCasa} vacio="No hay huéspedes hospedados actualmente." {...propsTabla} />
      </section>

      <section className="dashboard__seccion">
        <h2>Próximas llegadas ({proximasLlegadas.length})</h2>
        <TablaReservas reservas={proximasLlegadas} vacio="No hay reservas confirmadas para los próximos días." {...propsTabla} />
      </section>

      {reservaEditando && (
        <ModificarReserva
          reserva={reservaEditando}
          onCerrar={() => setReservaEditando(null)}
          onGuardada={() => {
            setMensaje({ tipo: 'exito', texto: `Reserva ${reservaEditando.codigo} actualizada. Se avisó al huésped por correo.` })
            setReservaEditando(null)
            recargar()
          }}
        />
      )}
    </div>
  )
}
