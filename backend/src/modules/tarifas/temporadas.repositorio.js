import { obtenerDb } from '../../db/conexion.js'

const SELECT_TEMPORADA = `
  SELECT t.id, t.nombre, t.inicio, t.fin, t.recargo, t.hotel_id AS hotelId, h.nombre AS hotelNombre
  FROM temporadas t
  LEFT JOIN hoteles h ON h.id = t.hotel_id`

export const temporadasRepositorio = {
  listar() {
    return obtenerDb().prepare(`${SELECT_TEMPORADA} ORDER BY t.inicio, t.id`).all()
  },

  buscarPorId(id) {
    return obtenerDb().prepare(`${SELECT_TEMPORADA} WHERE t.id = ?`).get(id) ?? null
  },

  /** Temporadas que tocan alguna noche de [desde, hasta) para ese hotel (las generales y las suyas). */
  aplicables(hotelId, desde, hasta) {
    return obtenerDb()
      .prepare(
        `SELECT id, nombre, inicio, fin, recargo, hotel_id AS hotelId FROM temporadas
         WHERE (hotel_id IS NULL OR hotel_id = ?) AND inicio < ? AND fin >= ?
         ORDER BY inicio`
      )
      .all(hotelId, hasta, desde)
  },

  crear({ nombre, inicio, fin, recargo, hotelId }) {
    const { lastInsertRowid } = obtenerDb()
      .prepare('INSERT INTO temporadas (nombre, inicio, fin, recargo, hotel_id) VALUES (?, ?, ?, ?, ?)')
      .run(nombre, inicio, fin, recargo, hotelId ?? null)
    return this.buscarPorId(Number(lastInsertRowid))
  },

  actualizar(id, cambios) {
    const columnas = { nombre: 'nombre', inicio: 'inicio', fin: 'fin', recargo: 'recargo', hotelId: 'hotel_id' }
    const claves = Object.keys(cambios).filter((k) => k in columnas)
    if (!claves.length) return
    const params = Object.fromEntries(claves.map((k) => [k, cambios[k] ?? null]))
    obtenerDb()
      .prepare(`UPDATE temporadas SET ${claves.map((k) => `${columnas[k]} = :${k}`).join(', ')} WHERE id = :id`)
      .run({ ...params, id })
  },

  eliminar(id) {
    return obtenerDb().prepare('DELETE FROM temporadas WHERE id = ?').run(id).changes
  },
}
