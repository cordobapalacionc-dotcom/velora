import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { IDIOMAS, MONEDAS, useIdioma } from '../context/IdiomaContext.jsx'

const NOMBRE_IDIOMA = { es: 'Español', en: 'English' }

/** Cierra un menú desplegable al hacer clic fuera o al presionar Escape. */
function useCerrarAlSalir(abierto, cerrar) {
  const ref = useRef(null)
  useEffect(() => {
    if (!abierto) return
    const alClic = (e) => ref.current && !ref.current.contains(e.target) && cerrar()
    const alTecla = (e) => e.key === 'Escape' && cerrar()
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto, cerrar])
  return ref
}

function SelectorPreferencias() {
  const { idioma, moneda, cambiarIdioma, cambiarMoneda, t } = useIdioma()
  const [abierto, setAbierto] = useState(false)
  const ref = useCerrarAlSalir(abierto, () => setAbierto(false))

  return (
    <div className="preferencias" ref={ref}>
      <button
        type="button"
        className="preferencias__boton"
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-label={t('nav.preferencias', { idioma: NOMBRE_IDIOMA[idioma], moneda })}
        onClick={() => setAbierto((v) => !v)}
      >
        <Globe size={15} aria-hidden="true" />
        {idioma.toUpperCase()}
        <span className="preferencias__moneda">· {moneda}</span>
      </button>
      {abierto && (
        <div className="preferencias__menu">
          <fieldset>
            <legend>{t('nav.idioma')}</legend>
            {IDIOMAS.map((i) => (
              <label key={i}>
                <input type="radio" name="idioma" checked={idioma === i} onChange={() => cambiarIdioma(i)} />
                <span lang={i}>{NOMBRE_IDIOMA[i]}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t('nav.moneda')}</legend>
            {MONEDAS.map((m) => (
              <label key={m}>
                <input type="radio" name="moneda" checked={moneda === m} onChange={() => cambiarMoneda(m)} />
                {t(`moneda.${m}`)}
              </label>
            ))}
          </fieldset>
          {moneda === 'USD' && <p className="preferencias__nota">{t('moneda.nota')}</p>}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { usuario, estaAutenticado, cerrarSesion } = useAuth()
  const { t } = useIdioma()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const refMenu = useCerrarAlSalir(menuAbierto, () => setMenuAbierto(false))
  const navegar = useNavigate()

  function manejarCerrarSesion() {
    cerrarSesion()
    setMenuAbierto(false)
    navegar('/')
  }

  return (
    <header className="navbar">
      <div className="navbar__contenido">
        <Link to="/" className="navbar__logo">
          VELORA
          <span className="navbar__logo-sub">{t('marca.lema')}</span>
        </Link>

        <nav className="navbar__enlaces" aria-label={t('nav.principal')}>
          <NavLink to="/" end>
            {t('nav.inicio')}
          </NavLink>
          <NavLink to="/buscar">{t('nav.hoteles')}</NavLink>
          {/* Enlace normal (no NavLink): apunta a una sección del inicio y no debe marcarse activo */}
          <Link to="/#colecciones">{t('nav.colecciones')}</Link>
        </nav>

        <div className="navbar__acciones">
          <SelectorPreferencias />
          {estaAutenticado ? (
            <div className="navbar__usuario" ref={refMenu}>
              <button
                type="button"
                className="navbar__usuario-boton"
                aria-expanded={menuAbierto}
                aria-haspopup="true"
                onClick={() => setMenuAbierto((v) => !v)}
              >
                {t('nav.hola', { nombre: usuario.nombre.split(' ')[0] })}
              </button>
              {menuAbierto && (
                <div className="navbar__usuario-menu">
                  <span className="navbar__usuario-correo">{usuario.correo}</span>
                  {/* Solo los clientes reservan; el personal ve todas las reservas en su panel */}
                  {usuario.rol === 'cliente' && (
                    <Link to="/mis-reservas" onClick={() => setMenuAbierto(false)}>
                      {t('nav.misReservas')}
                    </Link>
                  )}
                  {usuario.rol === 'admin' && (
                    <Link to="/admin" onClick={() => setMenuAbierto(false)}>
                      {t('nav.panelAdmin')}
                    </Link>
                  )}
                  {usuario.rol === 'recepcionista' && (
                    <Link to="/recepcion" onClick={() => setMenuAbierto(false)}>
                      {t('nav.panelRecepcion')}
                    </Link>
                  )}
                  <button type="button" onClick={manejarCerrarSesion}>
                    {t('nav.cerrarSesion')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/iniciar-sesion" className="btn btn--fantasma">
                <span className="navbar__texto-largo">{t('nav.iniciarSesion')}</span>
                <span className="navbar__texto-corto">{t('nav.entrar')}</span>
              </Link>
              <Link to="/crear-cuenta" className="btn btn--dorado navbar__registro">
                {t('nav.registrate')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
