import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../../config/env.js'
import { enTransaccion } from '../../db/conexion.js'
import { AppError, errores } from '../../utils/errores.js'
import { accesosRepositorio } from '../admin/accesos.repositorio.js'
import { enviarCorreoSinEsperar } from '../correo/correo.servicio.js'
import { usuariosRepositorio } from './usuarios.repositorio.js'

const RONDAS_BCRYPT = 10
const MINUTOS_ENLACE = 30
// Hash ficticio para que un correo inexistente tarde lo mismo que una contraseña incorrecta
// (evita adivinar qué correos están registrados midiendo el tiempo de respuesta).
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia', RONDAS_BCRYPT)

const hashToken = (token) => createHash('sha256').update(token).digest('hex')
const horaCorta = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })

function emitirToken(usuario) {
  return jwt.sign({ rol: usuario.rol, sv: usuario.sesionVersion }, config.jwt.secreto, {
    subject: String(usuario.id),
    expiresIn: config.jwt.expiracion,
    algorithm: 'HS256',
  })
}

function respuestaSesion(usuario) {
  const { id, nombre, correo, rol } = usuario
  return { token: emitirToken(usuario), usuario: { id, nombre, correo, rol } }
}

// Guarda el acceso para el dashboard del admin. Un fallo aquí nunca debe impedir iniciar sesión.
function registrarAcceso(datos) {
  try {
    accesosRepositorio.registrar(datos)
  } catch (error) {
    console.error('No se pudo registrar el acceso:', error.message)
  }
}

/**
 * Fallos de inicio de sesión de ese correo en la ventana de bloqueo (desde su último acceso exitoso).
 * Se cuenta por correo y no por usuario: así un correo inexistente se comporta igual que uno real
 * y no se puede averiguar qué cuentas existen.
 */
function estadoBloqueo(correo) {
  const { bloqueoIntentos, bloqueoMinutos } = config.seguridad
  const desde = new Date(Date.now() - bloqueoMinutos * 60000).toISOString()
  const { fallos, ultimoFallo } = accesosRepositorio.fallosRecientes(correo, desde)
  const hasta = ultimoFallo ? new Date(Date.parse(ultimoFallo) + bloqueoMinutos * 60000) : null
  return { fallos, bloqueada: fallos >= bloqueoIntentos, hasta, restantes: Math.max(0, bloqueoIntentos - fallos) }
}

function errorBloqueo(hasta) {
  const minutos = config.seguridad.bloqueoMinutos
  return new AppError(
    429,
    'CUENTA_BLOQUEADA',
    `Por seguridad, la cuenta quedó bloqueada ${minutos} minutos tras varios intentos fallidos. ` +
      `Intenta de nuevo después de las ${horaCorta.format(hasta)} o restablece tu contraseña.`,
    { desbloqueo: hasta.toISOString() }
  )
}

export function verificarToken(token) {
  try {
    return jwt.verify(token, config.jwt.secreto, { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

export const authServicio = {
  async registrar({ nombre, correo, contrasena }, contexto = {}) {
    if (usuariosRepositorio.existeCorreo(correo)) {
      throw errores.conflicto('Ya existe una cuenta registrada con ese correo.')
    }
    const contrasenaHash = await bcrypt.hash(contrasena, RONDAS_BCRYPT)
    // El registro público siempre crea clientes; los roles de personal no se auto-asignan.
    const usuario = usuariosRepositorio.crear({ nombre, correo, contrasenaHash, rol: 'cliente' })
    registrarAcceso({ ...contexto, usuarioId: usuario.id, correo, tipo: 'registro', exito: true })
    return respuestaSesion(usuario)
  },

  async iniciarSesion({ correo, contrasena }, contexto = {}) {
    // Durante el bloqueo ni siquiera se compara la contraseña: ni la correcta sirve.
    // Esos intentos se registran aparte (tipo "bloqueo") para que no alarguen el bloqueo.
    const antes = estadoBloqueo(correo)
    if (antes.bloqueada && antes.hasta > new Date()) {
      const usuarioId = usuariosRepositorio.buscarConHashPorCorreo(correo)?.id ?? null
      registrarAcceso({ ...contexto, usuarioId, correo, tipo: 'bloqueo', exito: false })
      throw errorBloqueo(antes.hasta)
    }

    const usuario = usuariosRepositorio.buscarConHashPorCorreo(correo)
    const valida = await bcrypt.compare(contrasena, usuario?.contrasenaHash ?? HASH_FICTICIO)
    const exito = Boolean(usuario && valida)
    registrarAcceso({ ...contexto, usuarioId: usuario?.id ?? null, correo, tipo: 'login', exito })
    if (exito) return respuestaSesion(usuario)

    const despues = estadoBloqueo(correo)
    if (despues.bloqueada) throw errorBloqueo(despues.hasta)
    const aviso =
      despues.restantes <= 2
        ? ` Te ${despues.restantes === 1 ? 'queda 1 intento' : `quedan ${despues.restantes} intentos`} antes de un bloqueo temporal.`
        : ''
    throw errores.noAutenticado(`Correo o contraseña incorrectos.${aviso}`)
  },

  /**
   * Envía un enlace para crear una contraseña nueva. Responde lo mismo exista o no la cuenta.
   * En desarrollo sin SMTP devuelve el enlace para poder probar sin un servidor de correo.
   */
  solicitarRestablecimiento({ correo }) {
    const usuario = usuariosRepositorio.buscarConHashPorCorreo(correo)
    const respuesta = { mensaje: 'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva.' }
    if (!usuario) return respuesta

    const token = randomBytes(32).toString('base64url')
    const expira = new Date(Date.now() + MINUTOS_ENLACE * 60000).toISOString()
    usuariosRepositorio.crearRestablecimiento(usuario.id, hashToken(token), expira)

    const enlace = `${config.urlSitio}/restablecer?token=${token}`
    enviarCorreoSinEsperar({
      para: usuario.correo,
      asunto: 'Restablece tu contraseña de Velora',
      titulo: 'Crea una contraseña nueva',
      parrafos: [
        `Hola, ${usuario.nombre}. Recibimos una solicitud para restablecer la contraseña de tu cuenta.`,
        `El enlace vence en ${MINUTOS_ENLACE} minutos y solo se puede usar una vez.`,
        'Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.',
      ],
      boton: { texto: 'Crear contraseña nueva', url: enlace },
    })
    return !config.esProduccion && !config.correo.smtp ? { ...respuesta, enlaceDesarrollo: enlace } : respuesta
  },

  async restablecer({ token, contrasena }, contexto = {}) {
    const contrasenaHash = await bcrypt.hash(contrasena, RONDAS_BCRYPT)
    const usuario = enTransaccion(() => {
      const usuarioId = usuariosRepositorio.consumirRestablecimiento(hashToken(token), new Date().toISOString())
      if (!usuarioId) return null
      return usuariosRepositorio.cambiarContrasena(usuarioId, contrasenaHash)
    })
    if (!usuario) {
      throw errores.reglaNegocio('El enlace no es válido o ya venció. Pide uno nuevo desde "¿Olvidaste tu contraseña?".')
    }

    // Cuenta como acceso exitoso: también levanta un bloqueo por intentos fallidos.
    registrarAcceso({ ...contexto, usuarioId: usuario.id, correo: usuario.correo, tipo: 'restablecimiento', exito: true })
    enviarCorreoSinEsperar({
      para: usuario.correo,
      asunto: 'Tu contraseña de Velora cambió',
      titulo: 'Tu contraseña cambió',
      parrafos: [
        `Hola, ${usuario.nombre}. La contraseña de tu cuenta se cambió correctamente y se cerraron las sesiones abiertas en otros equipos.`,
        'Si no fuiste tú, restablécela de nuevo de inmediato y comunícate con el hotel.',
      ],
    })
    return respuestaSesion(usuario)
  },
}
