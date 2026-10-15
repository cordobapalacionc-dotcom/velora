import { Fragment, useState } from 'react'
import { destinos } from '../data/hotels.js'
import { crearHotel, eliminarHotel } from '../../services/hotelesStore.js'
import { formatCOP } from '../../utils/currency.js'
import AdminHabitaciones from './AdminHabitaciones.jsx'

const HOTEL_VACIO = {
  nombre: '',
  destinoId: destinos[0]?.id ?? '',
  ubicacion: '',
  precioNoche: '',
  descripcionCorta: '',
  descripcion: '',
  imagen: '',
}

export default function AdminHoteles({ hoteles, onCambio }) {
  const [formulario, setFormulario] = useState(HOTEL_VACIO)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [error, setError] = useState('')
  const [hotelExpandidoId, setHotelExpandidoId] = useState(null)

  function actualizarCampo(campo, valor) {
    setFormulario((f) => ({ ...f, [campo]: valor }))
  }

  function manejarCrear(evento) {
    evento.preventDefault()
    setError('')
    if (!formulario.nombre.trim() || !formulario.ubicacion.trim() || !formulario.precioNoche) {
      setError('Completa al menos el nombre, la ubicación y el precio por noche.')
      return
    }
    crearHotel(formulario)
    setFormulario(HOTEL_VACIO)
    setMostrarFormulario(false)
    onCambio()
  }

  function manejarEliminar(hotel) {
    const confirmado = window.confirm(
      `¿Eliminar "${hotel.nombre}" del catálogo? Esta acción no se puede deshacer.`
    )
    if (confirmado) {
      eliminarHotel(hotel.id)
      onCambio()
    }
  }

  return (
    <section className="dashboard__seccion">
      <div className="dashboard__seccion-encabezado">
        <h2>Catálogo de hoteles ({hoteles.length})</h2>
        <button
          type="button"
          className="btn btn--dorado"
          onClick={() => setMostrarFormulario((v) => !v)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Agregar hotel'}
        </button>
      </div>

      {mostrarFormulario && (
        <form className="form-hotel" onSubmit={manejarCrear}>
          <div className="form-hotel__grid">
            <label>
              Nombre del hotel
              <input
                type="text"
                value={formulario.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                required
              />
            </label>
            <label>
              Destino
              <select
                value={formulario.destinoId}
                onChange={(e) => actualizarCampo('destinoId', e.target.value)}
              >
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ubicación
              <input
                type="text"
                value={formulario.ubicacion}
                onChange={(e) => actualizarCampo('ubicacion', e.target.value)}
                placeholder="Ej: Ciudad, País"
                required
              />
            </label>
            <label>
              Precio por noche (COP)
              <input
                type="number"
                min="0"
                value={formulario.precioNoche}
                onChange={(e) => actualizarCampo('precioNoche', e.target.value)}
                required
              />
            </label>
            <label className="form-hotel__ancho-completo">
              URL de imagen
              <input
                type="url"
                value={formulario.imagen}
                onChange={(e) => actualizarCampo('imagen', e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="form-hotel__ancho-completo">
              Descripción corta
              <input
                type="text"
                value={formulario.descripcionCorta}
                onChange={(e) => actualizarCampo('descripcionCorta', e.target.value)}
              />
            </label>
            <label className="form-hotel__ancho-completo">
              Descripción completa
              <textarea
                rows={3}
                value={formulario.descripcion}
                onChange={(e) => actualizarCampo('descripcion', e.target.value)}
              />
            </label>
          </div>

          {error && <p className="pagina-login__error">{error}</p>}

          <button type="submit" className="btn btn--oscuro">
            Guardar hotel
          </button>
        </form>
      )}

      <div className="tabla-envoltorio">
        <table className="tabla">
          <thead>
            <tr>
              <th>Hotel</th>
              <th>Ubicación</th>
              <th>Precio/noche</th>
              <th>Calificación</th>
              <th>Habitaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {hoteles.map((h) => (
              <Fragment key={h.id}>
                <tr>
                  <td>{h.nombre}</td>
                  <td>{h.ubicacion}</td>
                  <td>{formatCOP(h.precioNoche)}</td>
                  <td>{h.calificacion || 'Sin datos'}</td>
                  <td>{h.habitaciones.length}</td>
                  <td className="tabla__acciones">
                    <button
                      type="button"
                      className="tabla__accion"
                      onClick={() => setHotelExpandidoId((actual) => (actual === h.id ? null : h.id))}
                    >
                      {hotelExpandidoId === h.id ? 'Ocultar habitaciones' : 'Gestionar habitaciones'}
                    </button>
                    <button
                      type="button"
                      className="tabla__accion tabla__accion--eliminar"
                      onClick={() => manejarEliminar(h)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
                {hotelExpandidoId === h.id && (
                  <tr>
                    <td colSpan={6} className="tabla__fila-expandida">
                      <AdminHabitaciones hotel={h} onCambio={onCambio} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
