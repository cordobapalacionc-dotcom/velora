import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../../config/env.js'
import { errores } from '../../utils/errores.js'
import { usuariosRepositorio } from './usuarios.repositorio.js'

const RONDAS_BCRYPT = 10
// Hash ficticio para que un correo inexistente tarde lo mismo que una contraseña incorrecta
// (evita adivinar qué correos están registrados midiendo el tiempo de respuesta).
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia', RONDAS_BCRYPT)

function emitirToken(usuario) {
  return jwt.sign({ rol: usuario.rol }, config.jwt.secreto, {
    subject: String(usuario.id),
    expiresIn: config.jwt.expiracion,
    algorithm: 'HS256',
  })
}

function respuestaSesion(usuario) {
  const { id, nombre, correo, rol } = usuario
  return { token: emitirToken(usuario), usuario: { id, nombre, correo, rol } }
}

export function verificarToken(token) {
  try {
    return jwt.verify(token, config.jwt.secreto, { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

export const authServicio = {
  async registrar({ nombre, correo, contrasena }) {
    if (usuariosRepositorio.existeCorreo(correo)) {
      throw errores.conflicto('Ya existe una cuenta registrada con ese correo.')
    }
    const contrasenaHash = await bcrypt.hash(contrasena, RONDAS_BCRYPT)
    // El registro público siempre crea clientes; los roles de personal no se auto-asignan.
    const usuario = usuariosRepositorio.crear({ nombre, correo, contrasenaHash, rol: 'cliente' })
    return respuestaSesion(usuario)
  },

  async iniciarSesion({ correo, contrasena }) {
    const usuario = usuariosRepositorio.buscarConHashPorCorreo(correo)
    const valida = await bcrypt.compare(contrasena, usuario?.contrasenaHash ?? HASH_FICTICIO)
    if (!usuario || !valida) throw errores.noAutenticado('Correo o contraseña incorrectos.')
    return respuestaSesion(usuario)
  },
}
