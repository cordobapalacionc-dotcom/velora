import { CloudOff } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext.jsx'

/** Indicador de carga de una página o sección. Con `texto` se puede personalizar. */
export default function Cargando({ texto }) {
  const { t } = useIdioma()
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="cargando__punto" aria-hidden="true" />
      {texto ?? t('comun.cargando')}
    </div>
  )
}

/** Error al cargar datos, con botón para reintentar. */
export function ErrorCarga({ error, onReintentar }) {
  const { t, mensajeError } = useIdioma()
  return (
    <div className="estado-vacio" role="alert">
      <span className="estado-vacio__icono" aria-hidden="true">
        <CloudOff size={26} strokeWidth={1.5} />
      </span>
      <h2>{t('error.titulo')}</h2>
      <p>{mensajeError(error)}</p>
      {onReintentar && (
        <button type="button" className="btn btn--fantasma" onClick={onReintentar}>
          {t('comun.reintentar')}
        </button>
      )}
    </div>
  )
}
