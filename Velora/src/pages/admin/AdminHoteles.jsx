import { Fragment, useState } from 'react'
import { ErrorCarga } from '../../components/Cargando.jsx'
import SubirImagen from '../../components/SubirImagen.jsx'
import { useCatalogo } from '../../context/CatalogoContext.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'
import AdminHabitaciones from './AdminHabitaciones.jsx'

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const formularioDesde = (hotel, destinoPorDefecto) => ({
  nombre: hotel?.nombre ?? '',
  destinoId: hotel?.destinoId ?? destinoPorDefecto,
  ubicacion: hotel?.ubicacion ?? '',
  precioNoche: hotel?.precioNoche ?? '',
  descripcionCorta: hotel?.descripcionCorta ?? '',
  descripcion: hotel?.descripcion ?? '',
  imagen: hotel?.imagenes[0] ?? '',
  colecciones: hotel?.colecciones ?? [],
  en: { ubicacion: '', descripcionCorta: '', descripcion: '', ...hotel?.traducciones?.en },
})

/** Formulario para crear o editar un hotel. Los textos en inglés son opcionales. */
function FormularioHotel({ hotel, onGuardado, onCancelar }) {
  const { destinos, colecciones } = useCatalogo()
  const [formulario, setFormulario] = useState(() => formularioDesde(hotel, destinos[0]?.id ?? ''))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const actualizar = (campo, valor) => setFormulario((f) => ({ ...f, [campo]: valor }))
  const actualizarEn = (campo, valor) => setFormulario((f) => ({ ...f, en: { ...f.en, [campo]: valor } }))

  async function guardar(evento) {
    evento.preventDefault()
    setError('')
    setEnviando(true)
    const { imagen, en, precioNoche, ...resto } = formulario
    const datos = { ...resto, precioNoche: Number(precioNoche), traducciones: { en } }
    try {
      if (hotel) {
        // La imagen principal reemplaza a la primera de la galería; las demás se conservan.
        const imagenes = imagen ? [imagen, ...hotel.imagenes.slice(1).filter((u) => u !== imagen)] : hotel.imagenes
        await api.hoteles.actualizar(hotel.id, { ...datos, imagenes })
      } else {
        await api.hoteles.crear({ ...datos, ...(imagen ? { imagen } : {}) })
      }
      onGuardado()
    } catch (err) {
      setError(err.detalles?.map((d) => d.mensaje).join(' ') || err.message)
      setEnviando(false)
    }
  }

  return (
    <form className="form-hotel" onSubmit={guardar}>
      <div className="form-hotel__grid">
        <label>
          Nombre del hotel
          <input type="text" value={formulario.nombre} onChange={(e) => actualizar('nombre', e.target.value)} minLength={2} required />
        </label>
        <label>
          Destino
          <select value={formulario.destinoId} onChange={(e) => actualizar('destinoId', e.target.value)}>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ubicación
          <input type="text" value={formulario.ubicacion} onChange={(e) => actualizar('ubicacion', e.target.value)} placeholder="Ej: Ciudad, País" minLength={2} required />
        </label>
        <label>
          Precio por noche (COP)
          <input type="number" min="1" step="1" value={formulario.precioNoche} onChange={(e) => actualizar('precioNoche', e.target.value)} required />
        </label>
        <SubirImagen etiqueta="Imagen principal" valor={formulario.imagen} onCambio={(url) => actualizar('imagen', url)} />
        <fieldset className="form-hotel__ancho-completo form-hotel__casillas">
          <legend>Colecciones</legend>
          {colecciones.map((c) => (
            <label key={c.id} className="form-hotel__casilla">
              <input
                type="checkbox"
                checked={formulario.colecciones.includes(c.id)}
                onChange={(e) =>
                  actualizar('colecciones', e.target.checked ? [...formulario.colecciones, c.id] : formulario.colecciones.filter((x) => x !== c.id))
                }
              />
              {c.nombre}
            </label>
          ))}
        </fieldset>
        <label className="form-hotel__ancho-completo">
          Descripción corta
          <input type="text" value={formulario.descripcionCorta} onChange={(e) => actualizar('descripcionCorta', e.target.value)} maxLength={300} />
        </label>
        <label className="form-hotel__ancho-completo">
          Descripción completa
          <textarea rows={3} value={formulario.descripcion} onChange={(e) => actualizar('descripcion', e.target.value)} maxLength={5000} />
        </label>
        <details className="form-hotel__ancho-completo form-hotel__traducciones" open={Boolean(hotel?.traducciones?.en?.descripcion)}>
          <summary>Textos en inglés (opcional)</summary>
          <p className="tabla__subtexto">Si los dejas vacíos, el sitio en inglés muestra los textos en español.</p>
          <label>
            Location (ubicación)
            <input type="text" value={formulario.en.ubicacion} onChange={(e) => actualizarEn('ubicacion', e.target.value)} maxLength={160} lang="en" />
          </label>
          <label>
            Short description
            <input type="text" value={formulario.en.descripcionCorta} onChange={(e) => actualizarEn('descripcionCorta', e.target.value)} maxLength={300} lang="en" />
          </label>
          <label>
            Full description
            <textarea rows={3} value={formulario.en.descripcion} onChange={(e) => actualizarEn('descripcion', e.target.value)} maxLength={5000} lang="en" />
          </label>
        </details>
      </div>

      {error && (
        <p className="pagina-login__error" role="alert">
          {error}
        </p>
      )}

      <div className="form-hotel__acciones">
        {onCancelar && (
          <button type="button" className="btn btn--fantasma" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn--oscuro" disabled={enviando}>
          {enviando ? 'Guardando…' : hotel ? 'Guardar cambios' : 'Guardar hotel'}
        </button>
      </div>
    </form>
  )
}

export default function AdminHoteles() {
  const { datos: hoteles, error, recargar } = useConsulta('admin:hoteles', () => api.hoteles.listar())
  const [creando, setCreando] = useState(false)
  const [expandido, setExpandido] = useState(null) // { id, modo: 'habitaciones' | 'editar' }
  const [aviso, setAviso] = useState(null)

  async function eliminar(hotel) {
    if (!window.confirm(`¿Eliminar "${hotel.nombre}" del catálogo? Esta acción no se puede deshacer.`)) return
    setAviso(null)
    try {
      await api.hoteles.eliminar(hotel.id)
      setAviso({ tipo: 'exito', texto: `Se eliminó "${hotel.nombre}".` })
      recargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message })
    }
  }

  const alternar = (id, modo) => setExpandido((actual) => (actual?.id === id && actual.modo === modo ? null : { id, modo }))

  if (error && !hoteles) return <ErrorCarga error={error} onReintentar={recargar} />

  return (
    <section className="dashboard__seccion">
      <div className="dashboard__seccion-encabezado">
        <h2>Catálogo de hoteles ({hoteles?.length ?? '…'})</h2>
        <button type="button" className="btn btn--dorado" onClick={() => setCreando((v) => !v)} aria-expanded={creando}>
          {creando ? 'Cancelar' : '+ Agregar hotel'}
        </button>
      </div>

      {aviso && (
        <p className={aviso.tipo === 'exito' ? 'aviso-exito' : 'pagina-login__error'} role={aviso.tipo === 'exito' ? 'status' : 'alert'}>
          {aviso.texto}
        </p>
      )}

      {creando && (
        <FormularioHotel
          onGuardado={() => {
            setCreando(false)
            setAviso({ tipo: 'exito', texto: 'Hotel creado. Ya aparece en el sitio con una habitación estándar.' })
            recargar()
          }}
        />
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
              <th>
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!hoteles ? (
              <tr>
                <td colSpan={6} className="tabla__vacio">
                  Cargando hoteles…
                </td>
              </tr>
            ) : (
              hoteles.map((h) => (
                <Fragment key={h.id}>
                  <tr>
                    <td>{h.nombre}</td>
                    <td>{h.ubicacion}</td>
                    <td>{cop.format(h.precioNoche)}</td>
                    <td>{h.numResenas ? `${h.calificacion} (${h.numResenas})` : 'Sin reseñas'}</td>
                    <td>{h.habitaciones.length}</td>
                    <td className="tabla__acciones">
                      <button type="button" className="tabla__accion" aria-expanded={expandido?.id === h.id && expandido.modo === 'editar'} onClick={() => alternar(h.id, 'editar')}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="tabla__accion"
                        aria-expanded={expandido?.id === h.id && expandido.modo === 'habitaciones'}
                        onClick={() => alternar(h.id, 'habitaciones')}
                      >
                        {expandido?.id === h.id && expandido.modo === 'habitaciones' ? 'Ocultar habitaciones' : 'Gestionar habitaciones'}
                      </button>
                      <button type="button" className="tabla__accion tabla__accion--eliminar" onClick={() => eliminar(h)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                  {expandido?.id === h.id && (
                    <tr>
                      <td colSpan={6} className="tabla__fila-expandida">
                        {expandido.modo === 'editar' ? (
                          <FormularioHotel
                            hotel={h}
                            onCancelar={() => setExpandido(null)}
                            onGuardado={() => {
                              setExpandido(null)
                              setAviso({ tipo: 'exito', texto: `Se guardaron los cambios de "${h.nombre}".` })
                              recargar()
                            }}
                          />
                        ) : (
                          <AdminHabitaciones hotel={h} onCambio={recargar} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
