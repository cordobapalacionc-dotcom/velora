import { useState } from 'react'
import { CircleCheck, CircleX, Lock, LogIn, RefreshCw, ShieldAlert, UserPlus, Users } from 'lucide-react'
import GraficaBarras from '../../components/GraficaBarras.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'

const PERIODOS = [7, 14, 30]
const ROL_ETIQUETA = { admin: 'Admin', recepcionista: 'Recepción', cliente: 'Cliente' }
const EVENTO = {
  login: 'Inicio de sesión',
  registro: 'Creó su cuenta',
  bloqueo: 'Intento durante bloqueo',
  restablecimiento: 'Restableció su contraseña',
}

const formatoDia = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const dia = (iso) => formatoDia.format(new Date(`${iso}T00:00:00Z`))
const fechaHora = (iso) => formatoFechaHora.format(new Date(iso))

/** "Mozilla/5.0 (Windows NT 10.0…) … Edg/141" → "Edge · Windows" */
function describirNavegador(ua = '') {
  if (!ua) return '—'
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Otro'
  const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return so ? `${nav} · ${so}` : nav
}

export default function AdminAccesos() {
  const [dias, setDias] = useState(14)
  const { datos, error: errorCarga, cargando, recargar } = useConsulta(`accesos:${dias}`, () => api.admin.accesos(dias))
  const error = errorCarga?.message
  const resumen = datos?.resumen

  return (
    <section className="dashboard__seccion" aria-busy={cargando}>
      <div className="dashboard__seccion-encabezado">
        <h2>Accesos al sitio</h2>
        <div className="dashboard__filtros">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo">
            {PERIODOS.map((p) => (
              <option key={p} value={p}>
                Últimos {p} días
              </option>
            ))}
          </select>
          <button type="button" className="tabla__accion icono-en-linea" onClick={recargar}>
            <RefreshCw size={14} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </div>

      {error ? (
        <div className="estado-vacio">
          <span className="estado-vacio__icono" aria-hidden="true">
            <ShieldAlert size={26} strokeWidth={1.5} />
          </span>
          <h2>No se pudieron cargar los accesos</h2>
          <p>{error}</p>
          <button type="button" className="btn btn--fantasma" onClick={recargar}>
            Reintentar
          </button>
        </div>
      ) : !datos ? (
        <p className="tabla__vacio">Cargando accesos…</p>
      ) : (
        <>
          <div className="dashboard__stats">
            <div className="dashboard__stat">
              <span className="icono-en-linea"><LogIn size={14} aria-hidden="true" /> Inicios de sesión</span>
              <strong>{resumen.iniciosExitosos}</strong>
            </div>
            <div className="dashboard__stat">
              <span className="icono-en-linea"><Users size={14} aria-hidden="true" /> Usuarios distintos</span>
              <strong>{resumen.usuariosDistintos}</strong>
            </div>
            <div className="dashboard__stat">
              <span className="icono-en-linea"><UserPlus size={14} aria-hidden="true" /> Cuentas nuevas</span>
              <strong>{resumen.registros}</strong>
            </div>
            <div className="dashboard__stat">
              <span className="icono-en-linea"><ShieldAlert size={14} aria-hidden="true" /> Intentos fallidos</span>
              <strong>{resumen.intentosFallidos}</strong>
            </div>
            <div className="dashboard__stat">
              <span className="icono-en-linea"><Lock size={14} aria-hidden="true" /> Intentos con cuenta bloqueada</span>
              <strong>{resumen.intentosBloqueados}</strong>
            </div>
          </div>

          <div className="tarjeta-seccion">
            <GraficaBarras
              titulo="Inicios de sesión por día"
              nombreValor="inicios de sesión"
              columnasTabla={['Día', 'Inicios de sesión', 'Intentos fallidos']}
              datos={datos.porDia.map((d) => ({
                clave: d.dia,
                etiqueta: dia(d.dia),
                valor: d.exitosos,
                detalle: [`Intentos fallidos: ${d.fallidos}`],
              }))}
            />
          </div>

          <div className="tarjeta-seccion">
            <h2>Usuarios que iniciaron sesión ({datos.usuarios.length})</h2>
            <div className="tabla-envoltorio">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Accesos</th>
                    <th>Último acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="tabla__vacio">Nadie ha iniciado sesión en este periodo.</td>
                    </tr>
                  ) : (
                    datos.usuarios.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.nombre}
                          <br />
                          <span className="tabla__subtexto">{u.correo}</span>
                        </td>
                        <td>{ROL_ETIQUETA[u.rol] ?? u.rol}</td>
                        <td>{u.accesos}</td>
                        <td>{fechaHora(u.ultimoAcceso)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tarjeta-seccion">
            <h2>Actividad reciente</h2>
            <div className="tabla-envoltorio">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cuenta</th>
                    <th>Evento</th>
                    <th>Resultado</th>
                    <th>Navegador</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.recientes.map((r) => (
                    <tr key={r.id}>
                      <td>{fechaHora(r.fecha)}</td>
                      <td>
                        {r.nombre ?? <span className="tabla__subtexto">Cuenta inexistente</span>}
                        <br />
                        <span className="tabla__subtexto">{r.correo}</span>
                      </td>
                      <td>{EVENTO[r.tipo] ?? r.tipo}</td>
                      <td>
                        {r.exito ? (
                          <span className="resultado resultado--exito"><CircleCheck size={15} aria-hidden="true" /> Exitoso</span>
                        ) : r.tipo === 'bloqueo' ? (
                          <span className="resultado resultado--fallo"><Lock size={15} aria-hidden="true" /> Rechazado (cuenta bloqueada)</span>
                        ) : (
                          <span className="resultado resultado--fallo"><CircleX size={15} aria-hidden="true" /> Fallido</span>
                        )}
                      </td>
                      <td>{describirNavegador(r.navegador)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
