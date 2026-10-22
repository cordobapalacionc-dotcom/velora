import { useState } from 'react'
import SubirImagen from '../../components/SubirImagen.jsx'
import { api } from '../../services/api.js'

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const HABITACION_VACIA = { nombre: '', detalle: '', precio: '', capacidad: 2, imagen: '', destacado: false, nombreEn: '', detalleEn: '' }

/** Lo que espera la API a partir del formulario (los textos en inglés van en `traducciones`). */
function aDatosApi({ nombreEn, detalleEn, imagen, ...f }) {
  return {
    nombre: f.nombre.trim(),
    detalle: f.detalle.trim(),
    precio: Number(f.precio),
    capacidad: Number(f.capacidad),
    destacado: Boolean(f.destacado),
    traducciones: { en: { nombre: nombreEn.trim(), detalle: detalleEn.trim() } },
    ...(imagen ? { imagen } : {}),
  }
}

export default function AdminHabitaciones({ hotel, onCambio }) {
  const [formulario, setFormulario] = useState(HABITACION_VACIA)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [formEdicion, setFormEdicion] = useState(HABITACION_VACIA)
  const [enviando, setEnviando] = useState(false)

  const actualizarCampo = (campo, valor) => setFormulario((f) => ({ ...f, [campo]: valor }))
  const actualizarEdicion = (campo, valor) => setFormEdicion((f) => ({ ...f, [campo]: valor }))

  async function ejecutar(accion) {
    setError('')
    setEnviando(true)
    try {
      await accion()
      onCambio()
      return true
    } catch (err) {
      setError(err.detalles?.map((d) => d.mensaje).join(' ') || err.message)
      return false
    } finally {
      setEnviando(false)
    }
  }

  async function manejarAgregar(evento) {
    evento.preventDefault()
    const ok = await ejecutar(() => api.hoteles.crearHabitacion(hotel.id, aDatosApi(formulario)))
    if (ok) {
      setFormulario(HABITACION_VACIA)
      setMostrarFormulario(false)
    }
  }

  function iniciarEdicion(hab) {
    setEditandoId(hab.id)
    setFormEdicion({
      nombre: hab.nombre,
      detalle: hab.detalle || '',
      precio: hab.precio,
      capacidad: hab.capacidad,
      imagen: hab.imagen || '',
      destacado: Boolean(hab.destacado),
      nombreEn: hab.traducciones?.en?.nombre ?? '',
      detalleEn: hab.traducciones?.en?.detalle ?? '',
    })
  }

  async function guardarEdicion(habId) {
    if (await ejecutar(() => api.hoteles.actualizarHabitacion(hotel.id, habId, aDatosApi(formEdicion)))) setEditandoId(null)
  }

  function manejarEliminar(hab) {
    if (hotel.habitaciones.length <= 1) {
      setError('El hotel debe conservar al menos una habitación.')
      return
    }
    if (window.confirm(`¿Eliminar la habitación "${hab.nombre}"?`)) ejecutar(() => api.hoteles.eliminarHabitacion(hotel.id, hab.id))
  }

  return (
    <div className="admin-habitaciones">
      <div className="dashboard__seccion-encabezado">
        <h3>Habitaciones de {hotel.nombre}</h3>
        <button type="button" className="btn btn--dorado" onClick={() => setMostrarFormulario((v) => !v)} aria-expanded={mostrarFormulario}>
          {mostrarFormulario ? 'Cancelar' : '+ Agregar habitación'}
        </button>
      </div>

      {mostrarFormulario && (
        <form className="form-hotel" onSubmit={manejarAgregar}>
          <div className="form-hotel__grid">
            <label>
              Nombre
              <input type="text" value={formulario.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} minLength={2} required />
            </label>
            <label>
              Precio por noche (COP)
              <input type="number" min="1" value={formulario.precio} onChange={(e) => actualizarCampo('precio', e.target.value)} required />
            </label>
            <label>
              Capacidad (huéspedes)
              <input type="number" min="1" max="20" value={formulario.capacidad} onChange={(e) => actualizarCampo('capacidad', e.target.value)} required />
            </label>
            <label className="form-hotel__casilla">
              <input type="checkbox" checked={formulario.destacado} onChange={(e) => actualizarCampo('destacado', e.target.checked)} />
              Más reservada
            </label>
            <label className="form-hotel__ancho-completo">
              Detalle
              <input type="text" value={formulario.detalle} onChange={(e) => actualizarCampo('detalle', e.target.value)} placeholder="Ej: 30 m² · Cama Queen" />
            </label>
            <label>
              Nombre en inglés (opcional)
              <input type="text" lang="en" value={formulario.nombreEn} onChange={(e) => actualizarCampo('nombreEn', e.target.value)} />
            </label>
            <label>
              Detalle en inglés (opcional)
              <input type="text" lang="en" value={formulario.detalleEn} onChange={(e) => actualizarCampo('detalleEn', e.target.value)} />
            </label>
            <SubirImagen etiqueta="Imagen de la habitación" valor={formulario.imagen} onCambio={(url) => actualizarCampo('imagen', url)} />
          </div>
          <button type="submit" className="btn btn--oscuro" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar habitación'}
          </button>
        </form>
      )}

      {error && (
        <p className="pagina-login__error" role="alert">
          {error}
        </p>
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
              <th>
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {hotel.habitaciones.map((hab) =>
              editandoId === hab.id ? (
                <tr key={hab.id}>
                  <td>
                    <input type="text" aria-label="Nombre" value={formEdicion.nombre} onChange={(e) => actualizarEdicion('nombre', e.target.value)} />
                    <input type="text" aria-label="Nombre en inglés" placeholder="Nombre en inglés" lang="en" value={formEdicion.nombreEn} onChange={(e) => actualizarEdicion('nombreEn', e.target.value)} />
                  </td>
                  <td>
                    <input type="text" aria-label="Detalle" value={formEdicion.detalle} onChange={(e) => actualizarEdicion('detalle', e.target.value)} />
                    <input type="text" aria-label="Detalle en inglés" placeholder="Detalle en inglés" lang="en" value={formEdicion.detalleEn} onChange={(e) => actualizarEdicion('detalleEn', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" aria-label="Precio por noche" min="1" value={formEdicion.precio} onChange={(e) => actualizarEdicion('precio', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" aria-label="Capacidad" min="1" max="20" value={formEdicion.capacidad} onChange={(e) => actualizarEdicion('capacidad', e.target.value)} />
                  </td>
                  <td>
                    <input type="checkbox" aria-label="Más reservada" checked={formEdicion.destacado} onChange={(e) => actualizarEdicion('destacado', e.target.checked)} />
                  </td>
                  <td className="tabla__acciones">
                    <button type="button" className="tabla__accion" onClick={() => guardarEdicion(hab.id)} disabled={enviando}>
                      Guardar
                    </button>
                    <button type="button" className="tabla__accion" onClick={() => setEditandoId(null)}>
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={hab.id}>
                  <td>
                    {hab.nombre}
                    {hab.traducciones?.en?.nombre && (
                      <>
                        <br />
                        <span className="tabla__subtexto" lang="en">
                          {hab.traducciones.en.nombre}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{hab.detalle || '—'}</td>
                  <td>{cop.format(hab.precio)}</td>
                  <td>{hab.capacidad} huéspedes</td>
                  <td>{hab.destacado ? 'Sí' : '—'}</td>
                  <td className="tabla__acciones">
                    <button type="button" className="tabla__accion" onClick={() => iniciarEdicion(hab)}>
                      Editar
                    </button>
                    <button type="button" className="tabla__accion tabla__accion--eliminar" onClick={() => manejarEliminar(hab)}>
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
