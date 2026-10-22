import { useState } from 'react'
import AdminAccesos from './AdminAccesos.jsx'
import AdminHoteles from './AdminHoteles.jsx'
import AdminMetricas from './AdminMetricas.jsx'
import AdminResenas from './AdminResenas.jsx'
import AdminReservas from './AdminReservas.jsx'
import AdminTemporadas from './AdminTemporadas.jsx'

const TABS = [
  { id: 'resumen', etiqueta: 'Resumen', Componente: AdminMetricas },
  { id: 'hoteles', etiqueta: 'Hoteles', Componente: AdminHoteles },
  { id: 'reservas', etiqueta: 'Reservas', Componente: AdminReservas },
  { id: 'temporadas', etiqueta: 'Temporadas', Componente: AdminTemporadas },
  { id: 'resenas', etiqueta: 'Reseñas', Componente: AdminResenas },
  { id: 'accesos', etiqueta: 'Accesos', Componente: AdminAccesos },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('resumen')
  const { Componente } = TABS.find((t) => t.id === tab)

  return (
    <div className="pagina-dashboard">
      <header className="dashboard__encabezado">
        <div>
          <p className="seccion__etiqueta">Panel de administrador</p>
          <h1>Gestión de propiedades y reservas</h1>
        </div>
      </header>

      <nav className="dashboard__tabs" aria-label="Secciones del panel">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'activo' : ''} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.etiqueta}
          </button>
        ))}
      </nav>

      <Componente />
    </div>
  )
}
