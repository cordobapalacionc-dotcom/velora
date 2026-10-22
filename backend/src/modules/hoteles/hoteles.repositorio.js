import { obtenerDb } from '../../db/conexion.js'

const SELECT_HOTEL = `
  SELECT h.id, h.nombre, h.destino_id AS destinoId, h.ubicacion, h.calificacion, h.num_resenas AS numResenas,
         h.precio_noche AS precioNoche, h.descripcion_corta AS descripcionCorta, h.descripcion,
         h.reputacion, h.testimonio, h.traducciones,
         d.nombre AS destinoNombre, d.pais AS destinoPais, d.traducciones AS destinoTraducciones
  FROM hoteles h
  JOIN destinos d ON d.id = h.destino_id`

const SELECT_HABITACION = `
  SELECT hotel_id AS hotelId, id, nombre, detalle, precio, capacidad, imagen, destacado, traducciones
  FROM habitaciones`

function mapearHabitacion({ hotelId: _hotelId, ...fila }) {
  return { ...fila, destacado: fila.destacado === 1, traducciones: JSON.parse(fila.traducciones) }
}

/**
 * Las cifras guardadas en `hoteles` son las reseñas anteriores a Velora. Se combinan con las
 * reseñas verificadas (puntajes de 1 a 5, que en la reputación se muestran como porcentaje).
 */
function combinarReputacion(fila, resenas) {
  const base = JSON.parse(fila.reputacion)
  const nBase = fila.numResenas
  const n = resenas?.n ?? 0
  const total = nBase + n
  const porcentaje = (valorBase, sumaPuntajes) =>
    total ? Math.round(((valorBase ?? 0) * nBase + (sumaPuntajes ?? 0) * 20) / total) : 0
  const promedio = total ? Math.round(((fila.calificacion * nBase + (resenas?.calificacion ?? 0)) / total) * 10) / 10 : 0

  return {
    calificacion: promedio,
    numResenas: total,
    reputacion: {
      promedio,
      total,
      limpieza: porcentaje(base.limpieza, resenas?.limpieza),
      ubicacion: porcentaje(base.ubicacion, resenas?.ubicacion),
      cobertura: porcentaje(base.cobertura, resenas?.calidadPrecio),
      respuesta: porcentaje(base.respuesta, resenas?.atencion),
    },
  }
}

/** Completa hoteles con imágenes, habitaciones, colecciones y reseñas en 4 consultas (sin N+1). */
function hidratar(filas) {
  if (!filas.length) return []
  const db = obtenerDb()
  const ids = JSON.stringify(filas.map((f) => f.id))
  const enIds = 'hotel_id IN (SELECT value FROM json_each(?))'

  const imagenes = db.prepare(`SELECT hotel_id AS hotelId, url FROM hotel_imagenes WHERE ${enIds} ORDER BY orden`).all(ids)
  const habitaciones = db.prepare(`${SELECT_HABITACION} WHERE ${enIds} ORDER BY precio`).all(ids)
  const colecciones = db.prepare(`SELECT hotel_id AS hotelId, coleccion_id AS id FROM hotel_colecciones WHERE ${enIds}`).all(ids)
  const resenas = db
    .prepare(
      `SELECT hotel_id AS hotelId, COUNT(*) AS n, SUM(calificacion) AS calificacion, SUM(limpieza) AS limpieza,
              SUM(ubicacion) AS ubicacion, SUM(calidad_precio) AS calidadPrecio, SUM(atencion) AS atencion
       FROM resenas WHERE ${enIds} GROUP BY hotel_id`
    )
    .all(ids)

  return filas.map(({ destinoNombre, destinoPais, destinoTraducciones, ...f }) => ({
    ...f,
    ...combinarReputacion(f, resenas.find((r) => r.hotelId === f.id)),
    testimonio: f.testimonio ? JSON.parse(f.testimonio) : undefined,
    traducciones: JSON.parse(f.traducciones),
    destino: { id: f.destinoId, nombre: destinoNombre, pais: destinoPais, traducciones: JSON.parse(destinoTraducciones) },
    colecciones: colecciones.filter((c) => c.hotelId === f.id).map((c) => c.id),
    imagenes: imagenes.filter((i) => i.hotelId === f.id).map((i) => i.url),
    habitaciones: habitaciones.filter((h) => h.hotelId === f.id).map(mapearHabitacion),
  }))
}

export const hotelesRepositorio = {
  listar({ capacidadMinima, coleccionId } = {}) {
    const condiciones = []
    const params = {}
    if (capacidadMinima) {
      condiciones.push('EXISTS (SELECT 1 FROM habitaciones hab WHERE hab.hotel_id = h.id AND hab.capacidad >= :capacidad)')
      params.capacidad = capacidadMinima
    }
    if (coleccionId) {
      condiciones.push('EXISTS (SELECT 1 FROM hotel_colecciones hc WHERE hc.hotel_id = h.id AND hc.coleccion_id = :coleccion)')
      params.coleccion = coleccionId
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
    return hidratar(obtenerDb().prepare(`${SELECT_HOTEL} ${where} ORDER BY h.calificacion DESC, h.nombre`).all(params))
  },

  buscarPorId(id) {
    const fila = obtenerDb().prepare(`${SELECT_HOTEL} WHERE h.id = ?`).get(id)
    return fila ? hidratar([fila])[0] : null
  },

  existe(id) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM hoteles WHERE id = ?').get(id))
  },

  existeDestino(id) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM destinos WHERE id = ?').get(id))
  },

  coleccionesInexistentes(ids) {
    const existentes = new Set(obtenerDb().prepare('SELECT id FROM colecciones').all().map((c) => c.id))
    return ids.filter((id) => !existentes.has(id))
  },

  insertar(hotel) {
    obtenerDb()
      .prepare(
        `INSERT INTO hoteles (id, nombre, destino_id, ubicacion, precio_noche, descripcion_corta, descripcion, reputacion, traducciones)
         VALUES (:id, :nombre, :destinoId, :ubicacion, :precioNoche, :descripcionCorta, :descripcion, :reputacion, :traducciones)`
      )
      .run({ ...hotel, reputacion: JSON.stringify(hotel.reputacion), traducciones: JSON.stringify(hotel.traducciones ?? {}) })
  },

  actualizar(id, cambios) {
    const columnas = {
      nombre: 'nombre',
      destinoId: 'destino_id',
      ubicacion: 'ubicacion',
      precioNoche: 'precio_noche',
      descripcionCorta: 'descripcion_corta',
      descripcion: 'descripcion',
      traducciones: 'traducciones',
    }
    const claves = Object.keys(cambios).filter((k) => k in columnas)
    if (!claves.length) return
    const params = Object.fromEntries(
      claves.map((k) => [k, k === 'traducciones' ? JSON.stringify(cambios[k]) : cambios[k]])
    )
    obtenerDb()
      .prepare(`UPDATE hoteles SET ${claves.map((k) => `${columnas[k]} = :${k}`).join(', ')} WHERE id = :id`)
      .run({ ...params, id })
  },

  reemplazarImagenes(hotelId, urls) {
    const db = obtenerDb()
    db.prepare('DELETE FROM hotel_imagenes WHERE hotel_id = ?').run(hotelId)
    const insertar = db.prepare('INSERT INTO hotel_imagenes (hotel_id, url, orden) VALUES (?, ?, ?)')
    urls.forEach((url, i) => insertar.run(hotelId, url, i))
  },

  reemplazarColecciones(hotelId, ids) {
    const db = obtenerDb()
    db.prepare('DELETE FROM hotel_colecciones WHERE hotel_id = ?').run(hotelId)
    const insertar = db.prepare('INSERT INTO hotel_colecciones (hotel_id, coleccion_id) VALUES (?, ?)')
    new Set(ids).forEach((c) => insertar.run(hotelId, c))
  },

  eliminar(id) {
    return obtenerDb().prepare('DELETE FROM hoteles WHERE id = ?').run(id).changes
  },

  similares(id, cantidad) {
    const filas = obtenerDb()
      .prepare(
        `${SELECT_HOTEL} WHERE h.id <> :id
         ORDER BY (h.destino_id = (SELECT destino_id FROM hoteles WHERE id = :id)) DESC, h.calificacion DESC
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
        `INSERT INTO habitaciones (hotel_id, id, nombre, detalle, precio, capacidad, imagen, destacado, traducciones)
         VALUES (:hotelId, :id, :nombre, :detalle, :precio, :capacidad, :imagen, :destacado, :traducciones)`
      )
      .run({ ...hab, hotelId, destacado: hab.destacado ? 1 : 0, traducciones: JSON.stringify(hab.traducciones ?? {}) })
  },

  actualizarHabitacion(hotelId, habitacionId, cambios) {
    const columnas = ['nombre', 'detalle', 'precio', 'capacidad', 'imagen', 'destacado', 'traducciones']
    const params = Object.fromEntries(
      Object.entries(cambios)
        .filter(([k]) => columnas.includes(k))
        .map(([k, v]) => [k, k === 'destacado' ? (v ? 1 : 0) : k === 'traducciones' ? JSON.stringify(v) : v])
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

  /**
   * Rangos ocupados por habitación entre [desde, hasta), para el calendario público.
   * Solo fechas: nunca datos del huésped.
   */
  ocupacion(hotelId, desde, hasta) {
    return obtenerDb()
      .prepare(
        `SELECT habitacion_id AS habitacionId, entrada, salida FROM reservas
         WHERE hotel_id = ? AND estado IN ('confirmada', 'check-in') AND entrada < ? AND salida > ?
         ORDER BY entrada`
      )
      .all(hotelId, hasta, desde)
  },
}
