import { obtenerDb } from '../../db/conexion.js'

const SELECT_HOTEL = `
  SELECT id, nombre, destino_id AS destinoId, ubicacion, calificacion, num_resenas AS numResenas,
         precio_noche AS precioNoche, descripcion_corta AS descripcionCorta, descripcion,
         reputacion, testimonio
  FROM hoteles`

const SELECT_HABITACION = `
  SELECT hotel_id AS hotelId, id, nombre, detalle, precio, capacidad, imagen, destacado
  FROM habitaciones`

function mapearHabitacion({ hotelId: _hotelId, ...fila }) {
  return { ...fila, destacado: fila.destacado === 1 }
}

/** Completa hoteles con sus imágenes y habitaciones en 2 consultas (sin N+1). */
function hidratar(filas) {
  if (!filas.length) return []
  const db = obtenerDb()
  const ids = JSON.stringify(filas.map((f) => f.id))

  const imagenes = db
    .prepare('SELECT hotel_id AS hotelId, url FROM hotel_imagenes WHERE hotel_id IN (SELECT value FROM json_each(?)) ORDER BY orden')
    .all(ids)
  const habitaciones = db
    .prepare(`${SELECT_HABITACION} WHERE hotel_id IN (SELECT value FROM json_each(?)) ORDER BY precio`)
    .all(ids)

  return filas.map((f) => ({
    ...f,
    reputacion: JSON.parse(f.reputacion),
    testimonio: f.testimonio ? JSON.parse(f.testimonio) : undefined,
    imagenes: imagenes.filter((i) => i.hotelId === f.id).map((i) => i.url),
    habitaciones: habitaciones.filter((h) => h.hotelId === f.id).map(mapearHabitacion),
  }))
}

export const hotelesRepositorio = {
  listar({ texto, capacidadMinima } = {}) {
    const condiciones = []
    const params = {}
    if (texto) {
      condiciones.push(`(instr(lower(ubicacion), :texto) > 0 OR instr(lower(nombre), :texto) > 0 OR instr(destino_id, :texto) > 0)`)
      params.texto = texto.toLowerCase()
    }
    if (capacidadMinima) {
      condiciones.push('EXISTS (SELECT 1 FROM habitaciones hab WHERE hab.hotel_id = hoteles.id AND hab.capacidad >= :capacidad)')
      params.capacidad = capacidadMinima
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
    return hidratar(obtenerDb().prepare(`${SELECT_HOTEL} ${where} ORDER BY calificacion DESC, nombre`).all(params))
  },

  buscarPorId(id) {
    const fila = obtenerDb().prepare(`${SELECT_HOTEL} WHERE id = ?`).get(id)
    return fila ? hidratar([fila])[0] : null
  },

  existe(id) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM hoteles WHERE id = ?').get(id))
  },

  existeDestino(id) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM destinos WHERE id = ?').get(id))
  },

  insertar(hotel) {
    obtenerDb()
      .prepare(
        `INSERT INTO hoteles (id, nombre, destino_id, ubicacion, precio_noche, descripcion_corta, descripcion, reputacion)
         VALUES (:id, :nombre, :destinoId, :ubicacion, :precioNoche, :descripcionCorta, :descripcion, :reputacion)`
      )
      .run({ ...hotel, reputacion: JSON.stringify(hotel.reputacion) })
  },

  actualizar(id, cambios) {
    const columnas = {
      nombre: 'nombre',
      destinoId: 'destino_id',
      ubicacion: 'ubicacion',
      precioNoche: 'precio_noche',
      descripcionCorta: 'descripcion_corta',
      descripcion: 'descripcion',
    }
    const sets = Object.keys(cambios)
      .filter((k) => k in columnas)
      .map((k) => `${columnas[k]} = :${k}`)
    if (!sets.length) return
    const params = Object.fromEntries(Object.entries(cambios).filter(([k]) => k in columnas))
    obtenerDb().prepare(`UPDATE hoteles SET ${sets.join(', ')} WHERE id = :id`).run({ ...params, id })
  },

  reemplazarImagenes(hotelId, urls) {
    const db = obtenerDb()
    db.prepare('DELETE FROM hotel_imagenes WHERE hotel_id = ?').run(hotelId)
    const insertar = db.prepare('INSERT INTO hotel_imagenes (hotel_id, url, orden) VALUES (?, ?, ?)')
    urls.forEach((url, i) => insertar.run(hotelId, url, i))
  },

  eliminar(id) {
    return obtenerDb().prepare('DELETE FROM hoteles WHERE id = ?').run(id).changes
  },

  similares(id, cantidad) {
    const filas = obtenerDb()
      .prepare(
        `${SELECT_HOTEL} WHERE id <> :id
         ORDER BY (destino_id = (SELECT destino_id FROM hoteles WHERE id = :id)) DESC, calificacion DESC
         LIMIT :cantidad`
      )
      .all({ id, cantidad })
    return hidratar(filas)
  },

  contarReservas(hotelId, habitacionId) {
    const sql = habitacionId
      ? 'SELECT COUNT(*) AS total FROM reservas WHERE hotel_id = ? AND habitacion_id = ?'
      : 'SELECT COUNT(*) AS total FROM reservas WHERE hotel_id = ?'
    return obtenerDb().prepare(sql).get(...(habitacionId ? [hotelId, habitacionId] : [hotelId])).total
  },

  // ---- Habitaciones ----

  buscarHabitacion(hotelId, habitacionId) {
    const fila = obtenerDb().prepare(`${SELECT_HABITACION} WHERE hotel_id = ? AND id = ?`).get(hotelId, habitacionId)
    return fila ? mapearHabitacion(fila) : null
  },

  insertarHabitacion(hotelId, hab) {
    obtenerDb()
      .prepare(
        `INSERT INTO habitaciones (hotel_id, id, nombre, detalle, precio, capacidad, imagen, destacado)
         VALUES (:hotelId, :id, :nombre, :detalle, :precio, :capacidad, :imagen, :destacado)`
      )
      .run({ ...hab, hotelId, destacado: hab.destacado ? 1 : 0 })
  },

  actualizarHabitacion(hotelId, habitacionId, cambios) {
    const columnas = ['nombre', 'detalle', 'precio', 'capacidad', 'imagen', 'destacado']
    const params = Object.fromEntries(
      Object.entries(cambios)
        .filter(([k]) => columnas.includes(k))
        .map(([k, v]) => [k, k === 'destacado' ? (v ? 1 : 0) : v])
    )
    const sets = Object.keys(params).map((k) => `${k} = :${k}`)
    if (!sets.length) return
    obtenerDb()
      .prepare(`UPDATE habitaciones SET ${sets.join(', ')} WHERE hotel_id = :hotelId AND id = :habitacionId`)
      .run({ ...params, hotelId, habitacionId })
  },

  eliminarHabitacion(hotelId, habitacionId) {
    return obtenerDb().prepare('DELETE FROM habitaciones WHERE hotel_id = ? AND id = ?').run(hotelId, habitacionId).changes
  },

  contarHabitaciones(hotelId) {
    return obtenerDb().prepare('SELECT COUNT(*) AS total FROM habitaciones WHERE hotel_id = ?').get(hotelId).total
  },

  /** Ids de habitaciones del hotel ocupadas (reservas activas) en algún día del rango [entrada, salida). */
  habitacionesOcupadas(hotelId, entrada, salida) {
    return obtenerDb()
      .prepare(
        `SELECT DISTINCT habitacion_id AS id FROM reservas
         WHERE hotel_id = ? AND estado IN ('confirmada', 'check-in') AND entrada < ? AND salida > ?`
      )
      .all(hotelId, salida, entrada)
      .map((r) => r.id)
  },
}
