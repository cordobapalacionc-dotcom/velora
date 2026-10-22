import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { api } from '../services/api.js'

const RUTA_DE_MODO = { iniciar: '/iniciar-sesion', registro: '/crear-cuenta', recuperar: '/recuperar' }

export default function Login({ modoInicial = 'iniciar' }) {
  const [modo, setModo] = useState(modoInicial)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [recuperacion, setRecuperacion] = useState(null)
  const { iniciarSesion, registrarse, sesionExpirada } = useAuth()
  const { t, fechaHora, idioma, mensajeError } = useIdioma()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const destino = ubicacion.state?.desde ?? '/'

  function cambiarModo(nuevo) {
    setModo(nuevo)
    setError(null)
    setRecuperacion(null)
    // La URL refleja el modo: se puede compartir o recargar sin perderlo.
    navegar(RUTA_DE_MODO[nuevo], { replace: true, state: ubicacion.state })
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      if (modo === 'recuperar') {
        setRecuperacion(await api.auth.recuperar(correo))
        return
      }
      const usuario = modo === 'iniciar' ? await iniciarSesion(correo, contrasena) : await registrarse(nombre, correo, contrasena)
      // El personal entra directo a su panel si no venía de otra página.
      const inicioPorRol = { admin: '/admin', recepcionista: '/recepcion' }[usuario.rol]
      navegar(ubicacion.state?.desde ? destino : (inicioPorRol ?? '/'), { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  function textoError(err) {
    if (err.codigo === 'CUENTA_BLOQUEADA' && err.detalles?.desbloqueo) {
      return t('login.bloqueada', { hora: fechaHora(err.detalles.desbloqueo) })
    }
    if (idioma === 'en' && err.estado === 401) {
      // El servidor avisa en español cuántos intentos quedan antes del bloqueo; se conserva ese dato.
      const quedan = err.message.match(/queda(?:n)? (\d+) intento/)?.[1]
      return quedan ? `${t('login.incorrecto')} ${t(quedan === '1' ? 'login.quedaUno' : 'login.quedan', { n: quedan })}` : t('login.incorrecto')
    }
    if (idioma === 'en' && err.estado === 409) return t('login.yaExiste')
    if (idioma === 'en' && err.estado === 400) return t('login.datosInvalidos')
    // Para los datos inválidos del registro se muestra el primer problema concreto (p. ej. la contraseña).
    return err.detalles?.[0]?.mensaje ?? mensajeError(err)
  }

  const titulos = {
    iniciar: [t('login.tituloIniciar'), t('login.subtituloIniciar')],
    registro: [t('login.tituloRegistro'), t('login.subtituloRegistro')],
    recuperar: [t('login.tituloRecuperar'), t('login.subtituloRecuperar')],
  }

  return (
    <div className="pagina-login">
      <div className="pagina-login__imagen" aria-hidden="true" />
      <div className="pagina-login__formulario">
        <Link to="/" className="pagina-login__logo">
          VELORA
        </Link>

        {modo !== 'recuperar' && (
          <div className="pagina-login__tabs">
            <button type="button" className={modo === 'iniciar' ? 'activo' : ''} aria-pressed={modo === 'iniciar'} onClick={() => cambiarModo('iniciar')}>
              {t('nav.iniciarSesion')}
            </button>
            <button type="button" className={modo === 'registro' ? 'activo' : ''} aria-pressed={modo === 'registro'} onClick={() => cambiarModo('registro')}>
              {t('login.crearCuenta')}
            </button>
          </div>
        )}

        {sesionExpirada && modo === 'iniciar' && (
          <p className="pagina-login__ayuda" role="status">
            {t('login.sesionExpirada')}
          </p>
        )}

        <h1>{titulos[modo][0]}</h1>
        <p className="pagina-login__subtitulo">{titulos[modo][1]}</p>

        {recuperacion ? (
          <div className="pagina-login__ayuda" role="status">
            <p>{t('login.enlaceEnviado')}</p>
            {/* Solo en desarrollo, sin servidor de correo: el backend devuelve el enlace para poder probar. */}
            {recuperacion.enlaceDesarrollo && (
              <p className="pagina-login__desarrollo">
                {t('login.modoDesarrollo')}{' '}
                <a href={recuperacion.enlaceDesarrollo.replace(/^https?:\/\/[^/]+/, '')}>{t('login.abrirEnlace')}</a>
              </p>
            )}
            <button type="button" className="enlace-boton" onClick={() => cambiarModo('iniciar')}>
              {t('login.volver')}
            </button>
          </div>
        ) : (
          <form onSubmit={manejarEnvio} className="pagina-login__form">
            {modo === 'registro' && (
              <label>
                {t('login.nombre')}
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={t('login.nombrePista')}
                  autoComplete="name"
                  minLength={2}
                  required
                />
              </label>
            )}
            <label>
              {t('login.correo')}
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                required
              />
            </label>
            {modo !== 'recuperar' && (
              // El requisito va fuera del <label> (y enlazado con aria-describedby) para que no forme
              // parte del nombre del campo: se anuncia como descripción.
              <div className="pagina-login__campo">
                <label>
                  {t('login.contrasena')}
                  <input
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder={modo === 'registro' ? t('login.contrasenaPista') : ''}
                    autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                    minLength={modo === 'registro' ? 8 : undefined}
                    aria-describedby={modo === 'registro' ? 'requisito-contrasena' : undefined}
                    required
                  />
                </label>
                {modo === 'registro' && (
                  <span id="requisito-contrasena" className="pagina-login__requisito">
                    {t('login.contrasenaRequisito')}
                  </span>
                )}
              </div>
            )}

            {error && (
              <p className="pagina-login__error" role="alert">
                {textoError(error)}
              </p>
            )}

            <button type="submit" className="btn btn--dorado pagina-login__boton" disabled={enviando}>
              {enviando ? t('comun.enviando') : { iniciar: t('nav.iniciarSesion'), registro: t('login.crearCuenta'), recuperar: t('login.enviarEnlace') }[modo]}
            </button>
          </form>
        )}

        {modo === 'iniciar' && (
          <button type="button" className="pagina-login__olvido enlace-boton" onClick={() => cambiarModo('recuperar')}>
            {t('login.olvido')}
          </button>
        )}
        {modo === 'recuperar' && !recuperacion && (
          <button type="button" className="pagina-login__olvido enlace-boton" onClick={() => cambiarModo('iniciar')}>
            {t('login.volver')}
          </button>
        )}
      </div>
    </div>
  )
}
