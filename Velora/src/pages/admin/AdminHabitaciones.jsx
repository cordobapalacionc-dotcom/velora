import { useState } from 'react'
import { agregarHabitacion, actualizarHabitacion, eliminarHabitacion } from '../../services/hotelesStore.js'
import { formatCOP } from '../../utils/currency.js'

const HABITACION_VACIA = { nombre: '', detalle: '', precio: '', capacidad: 2, imagen: '', destacado: false }

export default function AdminHabitaciones({ hotel, onCambio }) {
  const [formulario, setFormulario] = useState(HABITACION_VACIA)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [formEdicion, setFormEdicion] = useState(HABITACION_VACIA)

  function actualizarCampo(campo, valor) {
    setFormulario((f) => ({ ...f, [campo]: valor }))
  }

  function manejarAgregar(evento) {
    evento.preventDefault()
    setError('')
    if (!formulario.nombre.trim() || !formulario.precio || !formulario.capacidad) {
      setError('Completa al menos el nombre, el precio y la capacidad.')
      return
    }
    agregarHabitacion(hotel.id, formulario)
    setFormulario(HABITACION_VACIA)
    setMostrarFormulario(false)
    onCambio()
  }

  function iniciarEdicion(hab) {
    setEditandoId(hab.id)
    setFormEdicion({
      nombre: hab.nombre,
      detalle: hab.detalle || '',
      precio: hab.precio,
      capacidad: hab.capacidad ?? 2,
      imagen: hab.imagen || '',
      destacado: Boolean(hab.destacado),
    })
  }

  function guardarEdicion(habId) {
    actualizarHabitacion(hotel.id, habId, formEdicion)
    setEditandoId(null)
    onCambio()
  }

  function manejarEliminar(hab) {
    if (hotel.habitaciones.length <= 1) {
      window.alert('El hotel debe conservar al menos una habitación.')
      return
    }
    if (window.confirm(`¿Eliminar la habitación "${hab.nombre}"?`)) {
      eliminarHabitacion(hotel.id, hab.id)
      onCambio()
    }
  }

  return (
    <div className="admin-habitaciones">
      <div className="dashboard__seccion-encabezado">
        <h3>Habitaciones de {hotel.nombre}</h3>
        <button
          type="button"
          className="btn btn--dorado"
          onClick={() => setMostrarFormulario((v) => !v)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Agregar habitación'}
        </button>
      </div>

      {mostrarFormulario && (
        <form className="form-hotel" onSubmit={manejarAgregar}>
          <div className="form-hotel__grid">
            <label>
              Nombre
              <input
                type="text"
                value={formulario.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                required
              />
            </label>
            <label>
              Precio por noche (COP)
              <input
                type="number"
                min="0"
                value={formulario.precio}
                onChange={(e) => actualizarCampo('precio', e.target.value)}
                required
              />
            </label>
            <label>
              Capacidad (huéspedes)
              <input
                type="number"
                min="1"
                max="6"
                value={formulario.capacidad}
                onChange={(e) => actualizarCampo('capacidad', e.target.value)}
                required
              />
            </label>
            <label className="form-hotel__casilla">
              <input
                type="checkbox"
                checked={formulario.destacado}
                onChange={(e) => actualizarCampo('destacado', e.target.checked)}
              />
              Más reservada
            </label>
            <label className="form-hotel__ancho-completo">
              Detalle
              <input
                type="text"
                value={formulario.detalle}
                onChange={(e) => actualizarCampo('detalle', e.target.value)}
                placeholder="Ej: 30 m² · Cama Queen"
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
          </div>

          {error && <p className="pagina-login__error">{error}</p>}

          <button type="submit" className="btn btn--oscuro">
            Guardar habitación
          </button>
        </form>
      )}

      <div className="tabla-envoltorio">
        <table className="tabla">
          <thead>
            <tr>
              <th>Habitación</th>
              <th>Detalle</th>
              <th>Precio/noche</th>
              <th>Capacidad</th>
              <th>Destacada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {hotel.habitaciones.map((hab) =>
              editandoId === hab.id ? (
                <tr key={hab.id}>
                  <td>
                    <input
                      type="text"
                      value={formEdicion.nombre}
                      onChange={(e) => setFormEdicion((f) => ({ ...f, nombre: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formEdicion.detalle}
                      onChange={(e) => setFormEdicion((f) => ({ ...f, detalle: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={formEdicion.precio}
                      onChange={(e) => setFormEdicion((f) => ({ ...f, precio: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formEdicion.capacidad}
                      onChange={(e) => setFormEdicion((f) => ({ ...f, capacidad: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={formEdicion.destacado}
                      onChange={(e) => setFormEdicion((f) => ({ ...f, destacado: e.target.checked }))}
                    />
                  </td>
                  <td className="tabla__acciones">
                    <button type="button" className="tabla__accion" onClick={() => guardarEdicion(hab.id)}>
                      Guardar
                    </button>
                    <button type="button" className="tabla__accion" onClick={() => setEditandoId(null)}>
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={hab.id}>
                  <td>{hab.nombre}</td>
                  <td>{hab.detalle || '—'}</td>
                  <td>{formatCOP(hab.precio)}</td>
                  <td>{hab.capacidad ?? 2} huéspedes</td>
                  <td>{hab.destacado ? 'Sí' : '—'}</td>
                  <td className="tabla__acciones">
                    <button type="button" className="tabla__accion" onClick={() => iniciarEdicion(hab)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="tabla__accion tabla__accion--eliminar"
                      onClick={() => manejarEliminar(hab)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
