import { verificarToken } from '../modules/auth/auth.servicio.js'
import { usuariosRepositorio } from '../modules/auth/usuarios.repositorio.js'
import { errores } from '../utils/errores.js'

function extraerToken(req) {
  const cabecera = req.get('authorization') ?? ''
  const [tipo, token] = cabecera.split(' ')
  return tipo === 'Bearer' && token ? token : null
}

/** Exige un JWT válido. El usuario se recarga desde la BD para reflejar cambios de rol o bajas. */
export function autenticar(req, _res, next) {
  const token = extraerToken(req)
  if (!token) return next(errores.noAutenticado())

  const payload = verificarToken(token)
  const usuario = payload && usuariosRepositorio.buscarPorId(Number(payload.sub))
  if (!usuario) return next(errores.noAutenticado('La sesión no es válida o expiró. Inicia sesión de nuevo.'))

  req.usuario = usuario
  next()
}

/** Restringe la ruta a ciertos roles. Debe ir después de `autenticar`. */
export function autorizar(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(errores.noAutenticado())
    if (!roles.includes(req.usuario.rol)) return next(errores.prohibido())
    next()
  }
}
