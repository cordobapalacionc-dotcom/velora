import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { ErrorCarga } from '../../components/Cargando.jsx'
import Stars from '../../components/Stars.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

/** Moderación: el admin ve las reseñas verificadas recientes y puede retirar las inapropiadas. */
export default function AdminResenas() {
  const { datos: resenas, error, recargar } = useConsulta('admin:resenas', () => api.resenas.listar())
  const [aviso, setAviso] = useState(null)

  async function retirar(r) {
    if (!window.confirm(`¿Retirar la reseña de ${r.autorNombre} sobre ${r.hotelNombre}? La calificación del hotel se recalcula.`)) return
    try {
      await api.resenas.eliminar(r.id)
      setAviso({ tipo: 'exito', texto: 'Reseña retirada.' })
      recargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message })
    }
  }

  if (error && !resenas) return <ErrorCarga error={error} onReintentar={recargar} />

  return (
    <section className="dashboard__seccion">
      <div className="dashboard__seccion-encabezado">
        <h2>Reseñas verificadas ({resenas?.length ?? '…'})</h2>
      </div>
      <p className="dashboard__ayuda">
        Solo pueden opinar los huéspedes cuya estadía terminó (check-out), una vez por reserva. En el sitio se muestra el nombre con la
        inicial del apellido; el correo solo lo ves tú.
      </p>
      {aviso && (
        <p className={aviso.tipo === 'exito' ? 'aviso-exito' : 'pagina-login__error'} role={aviso.tipo === 'exito' ? 'status' : 'alert'}>
          {aviso.texto}
        </p>
      )}
      {resenas?.length === 0 ? (
        <div className="estado-vacio">
          <span className="estado-vacio__icono" aria-hidden="true">
            <MessageSquareText size={26} strokeWidth={1.5} />
          </span>
          <h2>Todavía no hay reseñas</h2>
          <p>Aparecerán aquí cuando los huéspedes opinen después de su estadía.</p>
        </div>
      ) : (
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hotel</th>
                <th>Huésped</th>
                <th>Calificación</th>
                <th>Comentario</th>
                <th>
                  <span className="solo-lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(resenas ?? []).map((r) => (
                <tr key={r.id}>
                  <td>{formatoFecha.format(new Date(r.fecha))}</td>
                  <td>{r.hotelNombre}</td>
                  <td>
                    {r.autorNombre}
                    <br />
                    <span className="tabla__subtexto">{r.autorCorreo}</span>
                  </td>
                  <td>
                    <Stars calificacion={r.calificacion} />
                  </td>
                  <td className="tabla__texto-largo">{r.comentario}</td>
                  <td>
                    <button type="button" className="tabla__accion tabla__accion--eliminar" onClick={() => retirar(r)}>
                      Retirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
