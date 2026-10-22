import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext.jsx'

export default function NoEncontrada() {
  const { t } = useIdioma()
  return (
    <div className="pagina-vacia">
      <span className="estado-vacio__icono" aria-hidden="true">
        <Compass size={26} strokeWidth={1.5} />
      </span>
      <p className="seccion__etiqueta">{t('noEncontrada.etiqueta')}</p>
      <h1>{t('noEncontrada.titulo')}</h1>
      <p>{t('noEncontrada.texto')}</p>
      <div className="estado-vacio__sugerencias">
        <Link to="/" className="btn btn--dorado">
          {t('noEncontrada.inicio')}
        </Link>
        <Link to="/buscar" className="btn btn--fantasma">
          {t('noEncontrada.hoteles')}
        </Link>
      </div>
    </div>
  )
}
