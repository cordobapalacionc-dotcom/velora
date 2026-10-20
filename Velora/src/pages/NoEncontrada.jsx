import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NoEncontrada() {
  return (
    <div className="pagina-vacia">
      <span className="estado-vacio__icono" aria-hidden="true">
        <Compass size={26} strokeWidth={1.5} />
      </span>
      <p className="seccion__etiqueta">Error 404</p>
      <h1>Esta página no existe</h1>
      <p>Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <div className="estado-vacio__sugerencias">
        <Link to="/" className="btn btn--dorado">
          Ir al inicio
        </Link>
        <Link to="/buscar" className="btn btn--fantasma">
          Ver hoteles
        </Link>
      </div>
    </div>
  )
}
