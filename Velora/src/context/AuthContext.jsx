import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const CLAVE_USUARIOS = 'velora_usuarios'
const CLAVE_SESION = 'velora_sesion'

const USUARIOS_DEMO = [
  { nombre: 'Administrador Velora', correo: 'admin@velora.com', contrasena: 'admin123', rol: 'admin' },
  { nombre: 'Recepción Velora', correo: 'recepcion@velora.com', contrasena: 'recepcion123', rol: 'recepcionista' },
]

function leerUsuarios() {
  let usuarios = []
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_USUARIOS))
    if (Array.isArray(guardados)) usuarios = guardados
  } catch {
    usuarios = []
  }

  let cambiaron = false
  USUARIOS_DEMO.forEach((demo) => {
    const indice = usuarios.findIndex((u) => u.correo === demo.correo)
    if (indice === -1) {
      usuarios.push(demo)
      cambiaron = true
    } else if (usuarios[indice].contrasena !== demo.contrasena || usuarios[indice].rol !== demo.rol) {
      // Corrige la cuenta demo si quedó pisada por un registro previo con el mismo correo.
      usuarios[indice] = { ...usuarios[indice], ...demo }
      cambiaron = true
    }
  })
  if (cambiaron) guardarUsuarios(usuarios)
  return usuarios
}

function guardarUsuarios(usuarios) {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios))
}

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerSesion)

  function iniciarSesion(correo, contrasena) {
    const usuarios = leerUsuarios()
    const encontrado = usuarios.find((u) => u.correo === correo.trim().toLowerCase())
    if (!encontrado || encontrado.contrasena !== contrasena) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    const sesion = { nombre: encontrado.nombre, correo: encontrado.correo, rol: encontrado.rol }
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    setUsuario(sesion)
    return sesion
  }

  function registrarse(nombre, correo, contrasena) {
    const usuarios = leerUsuarios()
    const correoNormalizado = correo.trim().toLowerCase()
    if (usuarios.some((u) => u.correo === correoNormalizado)) {
      throw new Error('Ya existe una cuenta registrada con ese correo.')
    }
    const nuevoUsuario = { nombre: nombre.trim(), correo: correoNormalizado, contrasena, rol: 'cliente' }
    guardarUsuarios([...usuarios, nuevoUsuario])
    const sesion = { nombre: nuevoUsuario.nombre, correo: nuevoUsuario.correo, rol: nuevoUsuario.rol }
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    setUsuario(sesion)
    return sesion
  }

  function cerrarSesion() {
    localStorage.removeItem(CLAVE_SESION)
    setUsuario(null)
  }

  const valor = {
    usuario,
    estaAutenticado: Boolean(usuario),
    iniciarSesion,
    registrarse,
    cerrarSesion,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return contexto
}
