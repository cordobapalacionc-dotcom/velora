import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login({ modoInicial = 'iniciar' }) {
  const [modo, setModo] = useState(modoInicial)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const { iniciarSesion, registrarse } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const destino = ubicacion.state?.desde ?? '/'

  function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    try {
      if (modo === 'iniciar') {
        iniciarSesion(correo, contrasena)
      } else {
        if (!nombre.trim()) {
          setError('Ingresa tu nombre completo.')
          return
        }
        registrarse(nombre, correo, contrasena)
      }
      navegar(destino, { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="pagina-login">
      <div className="pagina-login__imagen" aria-hidden="true" />
      <div className="pagina-login__formulario">
        <Link to="/" className="pagina-login__logo">
          VELORA
        </Link>

        <div className="pagina-login__tabs">
          <button
            type="button"
            className={modo === 'iniciar' ? 'activo' : ''}
            onClick={() => {
              setModo('iniciar')
              setError('')
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={modo === 'registro' ? 'activo' : ''}
            onClick={() => {
              setModo('registro')
              setError('')
            }}
          >
            Crear cuenta
          </button>
        </div>

        <h1>{modo === 'iniciar' ? 'Bienvenido de nuevo' : 'Crea tu cuenta Velora'}</h1>
        <p className="pagina-login__subtitulo">
          {modo === 'iniciar'
            ? 'Ingresa a tu cuenta para gestionar tus reservas.'
            : 'Regístrate para guardar tus destinos favoritos y reservar más rápido.'}
        </p>

        <form onSubmit={manejarEnvio} className="pagina-login__form">
          {modo === 'registro' && (
            <label>
              Nombre completo
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                required
              />
            </label>
          )}
          <label>
            Correo electrónico
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </label>

          {error && <p className="pagina-login__error">{error}</p>}

          <button type="submit" className="btn btn--dorado pagina-login__boton">
            {modo === 'iniciar' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        {modo === 'iniciar' && <a className="pagina-login__olvido" href="#!">¿Olvidaste tu contraseña?</a>}
      </div>
    </div>
  )
}
