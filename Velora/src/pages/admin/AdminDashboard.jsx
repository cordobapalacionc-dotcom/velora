import { useMemo, useState } from 'react'
import { obtenerHoteles } from '../../services/hotelesStore.js'
import { obtenerReservas } from '../../services/reservasStore.js'
import { formatCOP } from '../../utils/currency.js'
import AdminHoteles from './AdminHoteles.jsx'
import AdminReservas from './AdminReservas.jsx'

const TABS = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'hoteles', etiqueta: 'Hoteles' },
  { id: 'reservas', etiqueta: 'Reservas' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('resumen')
  const [version, setVersion] = useState(0)
  const refrescar = () => setVersion((v) => v + 1)

  const hoteles = useMemo(() => obtenerHoteles(), [version])
  const reservas = useMemo(() => obtenerReservas(), [version])

  const reservasActivas = reservas.filter((r) => r.estado !== 'cancelada')
  const ingresosTotales = reservasActivas.reduce((acc, r) => acc + r.total, 0)

  const ingresosPorHotel = hoteles
    .map((h) => ({
      nombre: h.nombre,
      ingresos: reservasActivas
        .filter((r) => r.hotelId === h.id)
        .reduce((acc, r) => acc + r.total, 0),
    }))
    .sort((a, b) => b.ingresos - a.ingresos)
  const maxIngreso = Math.max(1, ...ingresosPorHotel.map((h) => h.ingresos))

  return (
    <div className="pagina-dashboard">
      <header className="dashboard__encabezado">
        <div>
          <p className="seccion__etiqueta">Panel de administrador</p>
          <h1>Gestión de propiedades y reservas</h1>
        </div>
      </header>

      <nav className="dashboard__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'activo' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.etiqueta}
          </button>
        ))}
      </nav>

      {tab === 'resumen' && (
        <section className="dashboard__seccion">
          <div className="dashboard__stats">
            <div className="dashboard__stat">
              <span>Hoteles activos</span>
              <strong>{hoteles.length}</strong>
            </div>
            <div className="dashboard__stat">
              <span>Reservas totales</span>
              <strong>{reservas.length}</strong>
            </div>
            <div className="dashboard__stat">
              <span>Reservas activas</span>
              <strong>{reservasActivas.length}</strong>
            </div>
            <div className="dashboard__stat">
              <span>Ingresos generados</span>
              <strong>{formatCOP(ingresosTotales)}</strong>
            </div>
          </div>

          <div className="tarjeta-seccion">
            <h2>Ingresos por hotel</h2>
            {ingresosPorHotel.length === 0 ? (
              <p>Aún no hay reservas registradas.</p>
            ) : (
              <div className="dashboard__barras">
                {ingresosPorHotel.map((h) => (
                  <div key={h.nombre} className="dashboard__barra">
                    <span className="dashboard__barra-etiqueta">{h.nombre}</span>
                    <div className="dashboard__barra-fondo">
                      <div
                        className="dashboard__barra-relleno"
                        style={{ width: `${(h.ingresos / maxIngreso) * 100}%` }}
                      />
                    </div>
                    <span className="dashboard__barra-valor">{formatCOP(h.ingresos)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'hoteles' && <AdminHoteles hoteles={hoteles} onCambio={refrescar} />}
      {tab === 'reservas' && <AdminReservas hoteles={hoteles} reservas={reservas} />}
    </div>
  )
}
