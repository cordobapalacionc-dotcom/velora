import { useRef, useState } from 'react'
import { ErrorCarga } from '../../components/Cargando.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'
import { hoyLocal } from '../../utils/fechas.js'

const VACIA = { nombre: '', inicio: '', fin: '', recargo: '', hotelId: '' }
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const fecha = (iso) => formatoFecha.format(new Date(`${iso}T00:00:00Z`))

async function cargar() {
  const [temporadas, hoteles] = await Promise.all([api.temporadas.listar(), api.hoteles.listar()])
  return { temporadas, hoteles }
}

/** Precios por temporada: recargo (o descuento) sobre el precio base de cada noche entre dos fechas. */
export default function AdminTemporadas() {
  const { datos, error, recargar } = useConsulta('admin:temporadas', cargar)
  const [formulario, setFormulario] = useState(VACIA)
  const [editandoId, setEditandoId] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const refFormulario = useRef(null)
  const actualizar = (campo, valor) => setFormulario((f) => ({ ...f, [campo]: valor }))

  async function guardar(evento) {
    evento.preventDefault()
    setAviso(null)
    setEnviando(true)
    const datosApi = { ...formulario, recargo: Number(formulario.recargo), hotelId: formulario.hotelId || null }
    try {
      if (editandoId) await api.temporadas.actualizar(editandoId, datosApi)
      else await api.temporadas.crear(datosApi)
      setAviso({ tipo: 'exito', texto: `Temporada "${formulario.nombre}" guardada. Los precios nuevos aplican a las reservas que se hagan desde ahora.` })
      setFormulario(VACIA)
      setEditandoId(null)
      recargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.detalles?.map((d) => d.mensaje).join(' ') || err.message })
    } finally {
      setEnviando(false)
    }
  }

  async function eliminar(t) {
    if (!window.confirm(`¿Eliminar la temporada "${t.nombre}"? Las reservas ya hechas conservan su precio.`)) return
    try {
      await api.temporadas.eliminar(t.id)
      recargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message })
    }
  }

  function editar(t) {
    setEditandoId(t.id)
    setFormulario({ nombre: t.nombre, inicio: t.inicio, fin: t.fin, recargo: String(t.recargo), hotelId: t.hotelId ?? '' })
    setAviso(null)
    // El formulario está arriba de la tabla: sin esto, con muchas temporadas parece que "Editar" no hace nada.
    refFormulario.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    refFormulario.current?.querySelector('input')?.focus({ preventScroll: true })
  }

  if (error && !datos) return <ErrorCarga error={error} onReintentar={recargar} />
  const hoy = hoyLocal()

  return (
    <section className="dashboard__seccion">
      <div className="dashboard__seccion-encabezado">
        <h2>Precios por temporada</h2>
      </div>
      <p className="dashboard__ayuda">
        Cada noche dentro de una temporada cuesta el precio base de la habitación más el recargo (o menos, si es negativo).
        Si dos temporadas coinciden, se aplica la de mayor recargo. Las reservas ya hechas no cambian de precio.
      </p>

      <form ref={refFormulario} className="form-hotel" onSubmit={guardar}>
        {editandoId && <p className="dashboard__ayuda"><strong>Editando: {datos?.temporadas.find((t) => t.id === editandoId)?.nombre}</strong></p>}
        <div className="form-hotel__grid">
          <label>
            Nombre
            <input type="text" value={formulario.nombre} onChange={(e) => actualizar('nombre', e.target.value)} placeholder="Ej: Temporada alta de fin de año" minLength={2} required />
          </label>
          <label>
            Aplica a
            <select value={formulario.hotelId} onChange={(e) => actualizar('hotelId', e.target.value)}>
              <option value="">Todos los hoteles</option>
              {datos?.hoteles.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde (primera noche)
            <input type="date" value={formulario.inicio} onChange={(e) => actualizar('inicio', e.target.value)} required />
          </label>
          <label>
            Hasta (última noche, incluida)
            <input type="date" value={formulario.fin} min={formulario.inicio} onChange={(e) => actualizar('fin', e.target.value)} required />
          </label>
          <label>
            Recargo (%)
            <input type="number" min="-50" max="200" step="1" value={formulario.recargo} onChange={(e) => actualizar('recargo', e.target.value)} placeholder="Ej: 30 o -10" required />
          </label>
        </div>
        {aviso && (
          <p className={aviso.tipo === 'exito' ? 'aviso-exito' : 'pagina-login__error'} role={aviso.tipo === 'exito' ? 'status' : 'alert'}>
            {aviso.texto}
          </p>
        )}
        <div className="form-hotel__acciones">
          {editandoId && (
            <button
              type="button"
              className="btn btn--fantasma"
              onClick={() => {
                setEditandoId(null)
                setFormulario(VACIA)
              }}
            >
              Cancelar edición
            </button>
          )}
          <button type="submit" className="btn btn--oscuro" disabled={enviando}>
            {enviando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar temporada'}
          </button>
        </div>
      </form>

      <div className="tabla-envoltorio">
        <table className="tabla">
          <thead>
            <tr>
              <th>Temporada</th>
              <th>Aplica a</th>
              <th>Fechas</th>
              <th>Ajuste</th>
              <th>
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!datos ? (
              <tr>
                <td colSpan={5} className="tabla__vacio">
                  Cargando temporadas…
                </td>
              </tr>
            ) : datos.temporadas.length === 0 ? (
              <tr>
                <td colSpan={5} className="tabla__vacio">
                  No hay temporadas: todas las noches cuestan el precio base.
                </td>
              </tr>
            ) : (
              datos.temporadas.map((t) => (
                <tr key={t.id} className={t.id === editandoId ? 'tabla__fila--editando' : t.fin < hoy ? 'tabla__fila--pasada' : undefined}>
                  <td>
                    {t.nombre}
                    {t.fin < hoy && (
                      <>
                        <br />
                        <span className="tabla__subtexto">Ya terminó</span>
                      </>
                    )}
                  </td>
                  <td>{t.hotelNombre ?? 'Todos los hoteles'}</td>
                  <td>
                    {fecha(t.inicio)} – {fecha(t.fin)}
                  </td>
                  <td>
                    <span className={t.recargo > 0 ? 'etiqueta-recargo etiqueta-recargo--alta' : 'etiqueta-recargo etiqueta-recargo--baja'}>
                      {t.recargo > 0 ? '+' : '−'}
                      {Math.abs(t.recargo)} %
                    </span>
                  </td>
                  <td className="tabla__acciones">
                    <button type="button" className="tabla__accion" onClick={() => editar(t)}>
                      Editar
                    </button>
                    <button type="button" className="tabla__accion tabla__accion--eliminar" onClick={() => eliminar(t)}>
                      Eliminar
                    </button>
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
