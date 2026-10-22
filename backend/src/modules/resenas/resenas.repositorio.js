import { obtenerDb } from '../../db/conexion.js'

const SELECT_RESENA = `
  SELECT r.id, r.reserva_id AS reservaId, r.hotel_id AS hotelId, h.nombre AS hotelNombre,
         r.calificacion, r.limpieza, r.ubicacion, r.calidad_precio AS calidadPrecio, r.atencion,
         r.comentario, r.fecha, u.nombre AS autorNombre, u.correo AS autorCorreo, res.salida AS fechaEstadia
  FROM resenas r
  JOIN usuarios u ON u.id = r.usuario_id
  JOIN hoteles h ON h.id = r.hotel_id
  JOIN reservas res ON res.id = r.reserva_id`

export const resenasRepositorio = {
  crear({ reservaId, usuarioId, hotelId, calificacion, limpieza, ubicacion, calidadPrecio, atencion, comentario }) {
    const { lastInsertRowid } = obtenerDb()
      .prepare(
        `INSERT INTO resenas (reserva_id, usuario_id, hotel_id, calificacion, limpieza, ubicacion, calidad_precio, atencion, comentario)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(reservaId, usuarioId, hotelId, calificacion, limpieza, ubicacion, calidadPrecio, atencion, comentario)
    return this.buscarPorId(Number(lastInsertRowid))
  },

  buscarPorId(id) {
    return obtenerDb().prepare(`${SELECT_RESENA} WHERE r.id = ?`).get(id) ?? null
  },

  existeParaReserva(reservaId) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM resenas WHERE reserva_id = ?').get(reservaId))
  },

  deHotel(hotelId, limite) {
    return obtenerDb().prepare(`${SELECT_RESENA} WHERE r.hotel_id = ? ORDER BY r.fecha DESC, r.id DESC LIMIT ?`).all(hotelId, limite)
  },

  contarDeHotel(hotelId) {
    return obtenerDb().prepare('SELECT COUNT(*) AS n FROM resenas WHERE hotel_id = ?').get(hotelId).n
  },

  recientes(limite) {
    return obtenerDb().prepare(`${SELECT_RESENA} ORDER BY r.fecha DESC, r.id DESC LIMIT ?`).all(limite)
  },

  eliminar(id) {
    return obtenerDb().prepare('DELETE FROM resenas WHERE id = ?').run(id).changes
  },
}
