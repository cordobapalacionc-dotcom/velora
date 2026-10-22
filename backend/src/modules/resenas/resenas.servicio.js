import { errores } from '../../utils/errores.js'
import { hotelesRepositorio } from '../hoteles/hoteles.repositorio.js'
import { reservasRepositorio } from '../reservas/reservas.repositorio.js'
import { resenasRepositorio as repo } from './resenas.repositorio.js'

/** "Ana María Gómez" → "Ana María G.": en público no se muestra el apellido completo ni el correo. */
function nombrePublico(nombre) {
  const partes = nombre.trim().split(/\s+/)
  if (partes.length < 2) return partes[0]
  const apellido = partes.at(-1)
  return `${partes.slice(0, -1).join(' ')} ${apellido[0].toUpperCase()}.`
}

function versionPublica({ autorNombre, autorCorreo: _correo, reservaId: _reserva, hotelNombre: _hotel, ...resena }) {
  return { ...resena, autor: nombrePublico(autorNombre) }
}

export const resenasServicio = {
  /** Solo el huésped de la reserva, y solo cuando ya hizo check-out. Una reseña por reserva. */
  crear(usuario, datos) {
    const reserva = reservasRepositorio.buscarPorId(datos.reservaId)
    if (!reserva || reserva.usuarioId !== usuario.id) throw errores.noEncontrado('No encontramos esa reserva.')
    if (reserva.estado !== 'check-out') {
      throw errores.reglaNegocio('Solo puedes opinar cuando tu estadía haya terminado (después del check-out).')
    }
    if (repo.existeParaReserva(reserva.id)) throw errores.conflicto('Ya escribiste una reseña para esta estadía.')
    // El trigger de la BD vuelve a comprobar que la estadía terminó y que es de este huésped.
    return versionPublica(repo.crear({ ...datos, usuarioId: usuario.id, hotelId: reserva.hotelId }))
  },

  listarDeHotel(hotelId, { limite }) {
    if (!hotelesRepositorio.existe(hotelId)) throw errores.noEncontrado('No encontramos ese hotel.')
    return { total: repo.contarDeHotel(hotelId), resenas: repo.deHotel(hotelId, limite).map(versionPublica) }
  },

  /** Para moderar: el admin ve también el correo del autor y el hotel. */
  recientes(limite = 50) {
    return repo.recientes(limite)
  },

  eliminar(id) {
    if (!repo.eliminar(id)) throw errores.noEncontrado('No encontramos esa reseña.')
  },
}
