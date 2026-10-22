import { createContext, useContext, useEffect, useState } from 'react'
import { alExpirarSesion, api, establecerToken } from '../services/api.js'

const AuthContext = createContext(null)
const CLAVE_SESION = 'velora_sesion'

// La sesión es el token del backend y los datos públicos del usuario. Las cuentas y las contraseñas
// viven solo en el backend: el navegador nunca guarda contraseñas.
function leerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION))
    return sesion?.token && sesion?.usuario ? sesion : null
  } catch {
    return null
  }
}

function guardarSesion(sesion) {
  establecerToken(sesion?.token)
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    else localStorage.removeItem(CLAVE_SESION)
  } catch {
    // Sin almacenamiento disponible: la sesión dura mientras la pestaña esté abierta.
  }
}

// El token debe estar listo antes de la primera petición, incluso las de los componentes hijos.
const sesionInicial = leerSesion()
establecerToken(sesionInicial?.token)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(sesionInicial)
  const [sesionExpirada, setSesionExpirada] = useState(false)

  function aplicar(nueva) {
    guardarSesion(nueva)
    setSesion(nueva)
  }

  // Si el backend rechaza el token (venció o se cambió la contraseña), se cierra la sesión y se avisa.
  useEffect(() => {
    alExpirarSesion(() => {
      guardarSesion(null)
      setSesion(null)
      setSesionExpirada(true)
    })
  }, [])

  // Al abrir el sitio se confirma que la sesión guardada sigue siendo válida (y se refresca nombre y rol).
  useEffect(() => {
    if (!sesionInicial) return
    api.auth
      .yo()
      .then(({ usuario }) => {
        const actual = leerSesion()
        if (actual?.token === sesionInicial.token) aplicar({ ...actual, usuario })
      })
      .catch(() => {}) // 401 ya lo maneja alExpirarSesion; si el backend está apagado, se mantiene la sesión
  }, [])

  /** Guarda la sesión que devuelve el backend tras iniciar sesión, registrarse o restablecer la contraseña. */
  function iniciarCon({ token, usuario }) {
    setSesionExpirada(false)
    aplicar({ token, usuario })
    return usuario
  }

  const valor = {
    usuario: sesion ? { ...sesion.usuario, token: sesion.token } : null,
    estaAutenticado: Boolean(sesion),
    sesionExpirada,
    iniciarSesion: async (correo, contrasena) => iniciarCon(await api.auth.login(correo, contrasena)),
    registrarse: async (nombre, correo, contrasena) => iniciarCon(await api.auth.registro(nombre, correo, contrasena)),
    iniciarCon,
    cerrarSesion: () => aplicar(null),
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return contexto
}
