import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { api } from '../services/api.js'

/** Página del enlace "olvidé mi contraseña": /restablecer?token=... */
export default function Restablecer() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { iniciarCon } = useAuth()
  const { t, idioma, mensajeError } = useIdioma()
  const navegar = useNavigate()
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    if (contrasena !== repetida) {
      setError(t('restablecer.noCoinciden'))
      return
    }
    setEnviando(true)
    try {
      // El backend responde con una sesión nueva: se entra directamente con la contraseña nueva.
      const usuario = iniciarCon(await api.auth.restablecer(token, contrasena))
      navegar({ admin: '/admin', recepcionista: '/recepcion' }[usuario.rol] ?? '/', { replace: true })
    } catch (err) {
      if (idioma === 'en' && err.estado === 422) setError(t('restablecer.vencido'))
      else setError(err.detalles?.[0]?.mensaje ?? mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pagina-login">
      <div className="pagina-login__imagen" aria-hidden="true" />
      <div className="pagina-login__formulario">
        <Link to="/" className="pagina-login__logo">
          VELORA
        </Link>
        <h1>{t('restablecer.titulo')}</h1>

        {!token ? (
          <>
            <p className="pagina-login__subtitulo">{t('restablecer.sinToken')}</p>
            <Link to="/recuperar" className="btn btn--dorado">
              {t('restablecer.pedirOtro')}
            </Link>
          </>
        ) : (
          <>
            <p className="pagina-login__subtitulo">{t('restablecer.subtitulo')}</p>
            <form onSubmit={manejarEnvio} className="pagina-login__form">
              <div className="pagina-login__campo">
                <label>
                  {t('restablecer.nueva')}
                  <input
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    aria-describedby="requisito-contrasena"
                    required
                  />
                </label>
                <span id="requisito-contrasena" className="pagina-login__requisito">
                  {t('login.contrasenaRequisito')}
                </span>
              </div>
              <label>
                {t('restablecer.repetir')}
                <input
                  type="password"
                  value={repetida}
                  onChange={(e) => setRepetida(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              {error && (
                <p className="pagina-login__error" role="alert">
                  {error}{' '}
                  {error.includes('venció') || error.includes('expired') ? <Link to="/recuperar">{t('restablecer.pedirOtro')}</Link> : null}
                </p>
              )}
              <button type="submit" className="btn btn--dorado pagina-login__boton" disabled={enviando}>
                {enviando ? t('comun.enviando') : t('restablecer.guardar')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
