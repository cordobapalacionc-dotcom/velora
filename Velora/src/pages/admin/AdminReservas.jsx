import { useMemo, useState } from 'react'
import { formatCOP } from '../../utils/currency.js'

const ESTADO_ETIQUETA = {
  confirmada: 'Confirmada',
  'check-in': 'En casa',
  'check-out': 'Finalizada',
  cancelada: 'Cancelada',
}

export default function AdminReservas({ hoteles, reservas }) {
  const [filtroHotel, setFiltroHotel] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const reservasFiltradas = useMemo(() => {
    return reservas
      .filter((r) => filtroHotel === 'todos' || r.hotelId === filtroHotel)
      .filter((r) => filtroEstado === 'todos' || r.estado === filtroEstado)
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
  }, [reservas, filtroHotel, filtroEstado])

  return (
    <section className="dashboard__seccion">
      <div className="dashboard__seccion-encabezado">
        <h2>Reservas ({reservasFiltradas.length})</h2>
        <div className="dashboard__filtros">
          <select value={filtroHotel} onChange={(e) => setFiltroHotel(e.target.value)}>
            <option value="todos">Todos los hoteles</option>
            {hoteles.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="check-in">En casa</option>
            <option value="check-out">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="tabla-envoltorio">
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Hotel</th>
              <th>Habitación</th>
              <th>Huésped</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="tabla__vacio">
                  No hay reservas que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              reservasFiltradas.map((r) => (
                <tr key={r.id}>
                  <td>{r.codigo}</td>
                  <td>{r.hotelNombre}</td>
                  <td>{r.habitacionNombre}</td>
                  <td>
                    {r.huespedNombre}
                    <br />
                    <span className="tabla__subtexto">{r.huespedCorreo}</span>
                  </td>
                  <td>{r.entrada || '—'}</td>
                  <td>{r.salida || '—'}</td>
                  <td>{formatCOP(r.total)}</td>
                  <td>
                    <span className={`etiqueta-estado etiqueta-estado--${r.estado}`}>
                      {ESTADO_ETIQUETA[r.estado] ?? r.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
