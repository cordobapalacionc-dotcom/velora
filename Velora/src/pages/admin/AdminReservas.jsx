import { useState } from 'react'
import { Download } from 'lucide-react'
import { ErrorCarga } from '../../components/Cargando.jsx'
import ModificarReserva from '../../components/ModificarReserva.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'
import { hoyLocal } from '../../utils/fechas.js'

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const ESTADO_ETIQUETA = {
  confirmada: 'Confirmada',
  'check-in': 'En casa',
  'check-out': 'Finalizada',
  cancelada: 'Cancelada',
}

async function cargar(filtros) {
  const [reservas, hoteles] = await Promise.all([api.reservas.listar(filtros), api.hoteles.listar()])
  return { reservas: reservas.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)), hoteles }
}

export default function AdminReservas() {
  const [filtroHotel, setFiltroHotel] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [reservaEditando, setReservaEditando] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [exportando, setExportando] = useState(false)
  // Los filtros los aplica el backend: así el Excel exporta exactamente lo que se ve.
  const filtros = { hotelId: filtroHotel, estado: filtroEstado, q: busqueda.trim() }
  const { datos, error, recargar, cargando } = useConsulta(`admin:reservas:${JSON.stringify(filtros)}`, () => cargar(filtros))

  async function exportar() {
    setExportando(true)
    setAviso(null)
    try {
      const archivo = await api.reservas.exportar(filtros)
      const enlace = document.createElement('a')
      enlace.href = URL.createObjectURL(archivo)
      enlace.download = `reservas-velora-${hoyLocal()}.csv`
      enlace.click()
      // Se libera después: revocarla de inmediato puede cancelar la descarga en algunos navegadores.
      setTimeout(() => URL.revokeObjectURL(enlace.href), 10000)
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message })
    } finally {
      setExportando(false)
    }
  }

  if (error && !datos) return <ErrorCarga error={error} onReintentar={recargar} />
  const reservas = datos?.reservas ?? []

  return (
    <section className="dashboard__seccion" aria-busy={cargando}>
      <div className="dashboard__seccion-encabezado">
        <h2>Reservas ({datos ? reservas.length : '…'})</h2>
        <div className="dashboard__filtros">
          <input
            type="search"
            className="dashboard__filtro-texto"
            placeholder="Nombre, correo o código"
            aria-label="Buscar por nombre, correo o código"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={filtroHotel} onChange={(e) => setFiltroHotel(e.target.value)} aria-label="Hotel">
            <option value="">Todos los hoteles</option>
            {datos?.hoteles.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_ETIQUETA).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--fantasma icono-en-linea" onClick={exportar} disabled={exportando || !reservas.length}>
            <Download size={15} aria-hidden="true" />
            {exportando ? 'Preparando…' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      {aviso && (
        <p className={aviso.tipo === 'exito' ? 'aviso-exito' : 'pagina-login__error'} role={aviso.tipo === 'exito' ? 'status' : 'alert'}>
          {aviso.texto}
        </p>
      )}

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
              <th>
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!datos ? (
              <tr>
                <td colSpan={9} className="tabla__vacio">
                  Cargando reservas…
                </td>
              </tr>
            ) : reservas.length === 0 ? (
              <tr>
                <td colSpan={9} className="tabla__vacio">
                  No hay reservas que coincidan con los filtros.
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
                  <td>{r.hotelNombre}</td>
                  <td>{r.habitacionNombre}</td>
                  <td>
                    {r.huespedNombre}
                    <br />
                    <span className="tabla__subtexto">{r.huespedCorreo}</span>
                  </td>
                  <td>{r.entrada}</td>
                  <td>{r.salida}</td>
                  <td>
                    {cop.format(r.total)}
                    {r.estado === 'cancelada' && (
                      <>
                        <br />
                        <span className="tabla__subtexto">{r.cargoCancelacion ? `Cargo: ${cop.format(r.cargoCancelacion)}` : 'Sin cargo'}</span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`etiqueta-estado etiqueta-estado--${r.estado}`}>{ESTADO_ETIQUETA[r.estado] ?? r.estado}</span>
                  </td>
                  <td>
                    {['confirmada', 'check-in'].includes(r.estado) && (
                      <button type="button" className="tabla__accion" onClick={() => setReservaEditando(r)}>
                        Modificar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reservaEditando && (
        <ModificarReserva
          reserva={reservaEditando}
          onCerrar={() => setReservaEditando(null)}
          onGuardada={() => {
            setAviso({ tipo: 'exito', texto: `Reserva ${reservaEditando.codigo} actualizada. Se avisó al huésped por correo.` })
            setReservaEditando(null)
            recargar()
          }}
        />
      )}
    </section>
  )
}
