import { useMemo, useState } from 'react'
import { buscarReservas, marcarCheckIn, marcarCheckOut } from '../../services/reservasStore.js'

const ESTADO_ETIQUETA = {
  confirmada: 'Por ingresar',
  'check-in': 'En casa',
  'check-out': 'Finalizada',
  cancelada: 'Cancelada',
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function TablaReservas({ reservas, vacio, onConfirmarEntrada, onConfirmarSalida }) {
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
            <th></th>
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
                <td>{r.codigo}</td>
                <td>
                  {r.huespedNombre}
                  <br />
                  <span className="tabla__subtexto">{r.huespedCorreo}</span>
                </td>
                <td>{r.hotelNombre}</td>
                <td>{r.habitacionNombre}</td>
                <td>{r.entrada || '—'}</td>
                <td>{r.salida || '—'}</td>
                <td>
                  <span className={`etiqueta-estado etiqueta-estado--${r.estado}`}>
                    {ESTADO_ETIQUETA[r.estado] ?? r.estado}
                  </span>
                </td>
                <td>
                  {r.estado === 'confirmada' && (
                    <button
                      type="button"
                      className="btn btn--dorado tabla__boton"
                      onClick={() => onConfirmarEntrada(r.id)}
                    >
                      Confirmar entrada
                    </button>
                  )}
                  {r.estado === 'check-in' && (
                    <button
                      type="button"
                      className="btn btn--oscuro tabla__boton"
                      onClick={() => onConfirmarSalida(r.id)}
                    >
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
  const [version, setVersion] = useState(0)
  const refrescar = () => setVersion((v) => v + 1)

  const todas = useMemo(() => buscarReservas(''), [version])
  const fechaHoy = hoy()

  const llegadasHoy = todas.filter((r) => r.entrada === fechaHoy && r.estado === 'confirmada')
  const salidasHoy = todas.filter((r) => r.salida === fechaHoy && r.estado === 'check-in')
  const enCasa = todas.filter((r) => r.estado === 'check-in')

  const resultadosBusqueda = useMemo(() => {
    if (!busqueda.trim()) return []
    return buscarReservas(busqueda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, version])

  function confirmarEntrada(id) {
    marcarCheckIn(id)
    refrescar()
  }

  function confirmarSalida(id) {
    marcarCheckOut(id)
    refrescar()
  }

  return (
    <div className="pagina-dashboard">
      <header className="dashboard__encabezado">
        <div>
          <p className="seccion__etiqueta">Panel de recepción</p>
          <h1>Validación de entradas y salidas</h1>
        </div>
      </header>

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
          type="text"
          className="dashboard__buscador"
          placeholder="Buscar por nombre, correo o código de reserva..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda.trim() && (
          <TablaReservas
            reservas={resultadosBusqueda}
            vacio="No encontramos reservas con ese criterio."
            onConfirmarEntrada={confirmarEntrada}
            onConfirmarSalida={confirmarSalida}
          />
        )}
      </section>

      <section className="dashboard__seccion">
        <h2>Llegadas de hoy ({llegadasHoy.length})</h2>
        <TablaReservas
          reservas={llegadasHoy}
          vacio="No hay llegadas programadas para hoy."
          onConfirmarEntrada={confirmarEntrada}
          onConfirmarSalida={confirmarSalida}
        />
      </section>

      <section className="dashboard__seccion">
        <h2>Huéspedes en casa ({enCasa.length})</h2>
        <TablaReservas
          reservas={enCasa}
          vacio="No hay huéspedes hospedados actualmente."
          onConfirmarEntrada={confirmarEntrada}
          onConfirmarSalida={confirmarSalida}
        />
      </section>
    </div>
  )
}
