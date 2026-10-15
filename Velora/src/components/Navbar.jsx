import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { usuario, estaAutenticado, cerrarSesion } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
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
          <span className="navbar__logo-sub">Hospitalidad selecta</span>
        </Link>

        <nav className="navbar__enlaces">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/buscar">Destinos</NavLink>
          <NavLink to="/buscar?coleccion=1">Colecciones</NavLink>
          <NavLink to="/buscar?ofertas=1">Ofertas</NavLink>
        </nav>

        <div className="navbar__acciones">
          {estaAutenticado ? (
            <div className="navbar__usuario">
              <button
                type="button"
                className="navbar__usuario-boton"
                onClick={() => setMenuAbierto((v) => !v)}
              >
                Hola, {usuario.nombre.split(' ')[0]}
              </button>
              {menuAbierto && (
                <div className="navbar__usuario-menu">
                  <span className="navbar__usuario-correo">{usuario.correo}</span>
                  {usuario.rol === 'admin' && (
                    <Link to="/admin" onClick={() => setMenuAbierto(false)}>
                      Panel de administrador
                    </Link>
                  )}
                  {usuario.rol === 'recepcionista' && (
                    <Link to="/recepcion" onClick={() => setMenuAbierto(false)}>
                      Panel de recepción
                    </Link>
                  )}
                  <button type="button" onClick={manejarCerrarSesion}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/iniciar-sesion" className="btn btn--fantasma">
                Iniciar sesión
              </Link>
              <Link to="/crear-cuenta" className="btn btn--dorado">
                Regístrate
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
