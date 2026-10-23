import { obtenerDb } from '../../db/conexion.js'

const SELECT_RESERVA = `
  SELECT id, codigo, usuario_id AS usuarioId, hotel_id AS hotelId, habitacion_id AS habitacionId,
         hotel_nombre AS hotelNombre, habitacion_nombre AS habitacionNombre,
         huesped_nombre AS huespedNombre, huesped_correo AS huespedCorreo,
         entrada, salida, huespedes, noches, precio_noche AS precioNoche, subtotal, impuestos,
         tarifa_limpieza AS tarifaLimpieza, total, estado, cargo_cancelacion AS cargoCancelacion, cancelada_por AS canceladaPor,
         fecha_creacion AS fechaCreacion, fecha_check_in AS fechaCheckIn, fecha_check_out AS fechaCheckOut,
         fecha_cancelacion AS fechaCancelacion,
         (SELECT r.id FROM resenas r WHERE r.reserva_id = reservas.id) AS resenaId
  FROM reservas`

const COLUMNA_FECHA_POR_ESTADO = {
  'check-in': 'fecha_check_in',
  'check-out': 'fecha_check_out',
  cancelada: 'fecha_cancelacion',
}

/** Agrega a cada reserva su historial de modificaciones (una sola consulta para toda la lista). */
function conHistorial(reservas) {
  if (!reservas.length) return reservas
  const modificaciones = obtenerDb()
    .prepare(
      `SELECT reserva_id AS reservaId, por_correo AS por, detalle, total_anterior AS totalAnterior,
              total_nuevo AS totalNuevo, fecha
       FROM reserva_modificaciones
       WHERE reserva_id IN (SELECT value FROM json_each(?))
       ORDER BY fecha, id`
    )
    .all(JSON.stringify(reservas.map((r) => r.id)))
  return reservas.map((r) => ({
    ...r,
    modificaciones: modificaciones.filter((m) => m.reservaId === r.id).map(({ reservaId: _id, ...m }) => m),
  }))
}

export const reservasRepositorio = {
  buscarPorId(id) {
    const reserva = obtenerDb().prepare(`${SELECT_RESERVA} WHERE id = ?`).get(id)
    return reserva ? conHistorial([reserva])[0] : null
  },

  listar({ usuarioId, q, estado, hotelId } = {}) {
    const condiciones = []
    const params = {}
    if (usuarioId) {
      condiciones.push('usuario_id = :usuarioId')
      params.usuarioId = usuarioId
    }
    if (estado) {
      condiciones.push('estado = :estado')
      params.estado = estado
    }
    if (hotelId) {
      condiciones.push('hotel_id = :hotelId')
      params.hotelId = hotelId
    }
    if (q) {
      condiciones.push('(instr(lower(huesped_nombre), :q) > 0 OR instr(huesped_correo, :q) > 0 OR instr(lower(codigo), :q) > 0)')
      params.q = q.toLowerCase()
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
    return conHistorial(obtenerDb().prepare(`${SELECT_RESERVA} ${where} ORDER BY entrada DESC, fecha_creacion DESC`).all(params))
  },

  existeCodigo(codigo) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM reservas WHERE codigo = ?').get(codigo))
  },

  /**
   * Inserta la reserva solo si TODAS las condiciones se cumplen en el mismo instante,
   * en una única sentencia atómica (no hay hueco entre "comprobar" y "guardar"):
   *  - la habitación existe y admite esa cantidad de huéspedes,
   *  - su precio sigue siendo el que se cotizó (si el admin lo cambió, no se cobra un precio viejo),
   *  - no hay reservas activas que se crucen con [entrada, salida)   ← subconsulta NOT EXISTS.
   * Los nombres del hotel y la habitación salen de la propia BD (subconsulta/JOIN), no del cliente.
   * Devuelve true si se insertó; false si alguna condición falló.
   */
  insertarSiDisponible(r) {
    const { changes } = obtenerDb()
      .prepare(
        `INSERT INTO reservas (id, codigo, usuario_id, hotel_id, habitacion_id, hotel_nombre, habitacion_nombre,
                               huesped_nombre, huesped_correo, entrada, salida, huespedes, noches, precio_noche,
                               subtotal, impuestos, tarifa_limpieza, total)
         SELECT :id, :codigo, :usuarioId, hab.hotel_id, hab.id, h.nombre, hab.nombre,
                :huespedNombre, :huespedCorreo, :entrada, :salida, :huespedes, :noches, hab.precio,
                :subtotal, :impuestos, :tarifaLimpieza, :total
         FROM habitaciones hab
         JOIN hoteles h ON h.id = hab.hotel_id
         WHERE hab.hotel_id = :hotelId
           AND hab.id = :habitacionId
           AND hab.capacidad >= :huespedes
           AND hab.precio = :precioNoche
           AND NOT EXISTS (
             SELECT 1 FROM reservas r
             WHERE r.hotel_id = hab.hotel_id
               AND r.habitacion_id = hab.id
               AND r.estado IN ('confirmada', 'check-in')
               AND r.entrada < :salida
               AND r.salida > :entrada
           )`
      )
      .run({
        id: r.id,
        codigo: r.codigo,
        usuarioId: r.usuarioId,
        hotelId: r.hotelId,
        habitacionId: r.habitacionId,
        huespedNombre: r.huespedNombre,
        huespedCorreo: r.huespedCorreo,
        entrada: r.entrada,
        salida: r.salida,
        huespedes: r.huespedes,
        noches: r.noches,
        precioNoche: r.precioNoche,
        subtotal: r.subtotal,
        impuestos: r.impuestos,
        tarifaLimpieza: r.tarifaLimpieza,
        total: r.total,
      })
    return changes === 1
  },

  /** Reservas activas que se cruzan con el rango; sirve para explicar un rechazo. */
  reservasQueSeCruzan(hotelId, habitacionId, entrada, salida, excluirId = null) {
    return obtenerDb()
      .prepare(
        `SELECT codigo, entrada, salida FROM reservas
         WHERE hotel_id = ? AND habitacion_id = ? AND estado IN ('confirmada', 'check-in')
           AND entrada < ? AND salida > ? AND id IS NOT ?
         ORDER BY entrada`
      )
      .all(hotelId, habitacionId, salida, entrada, excluirId)
  },

  /**
   * Modifica habitación, fechas, huéspedes y montos en UNA sentencia, solo si:
   *  - la reserva sigue en el estado que se leyó (nadie la cambió mientras tanto), y
   *  - ninguna OTRA reserva activa ocupa esa habitación en las fechas nuevas (subconsulta NOT EXISTS).
   * Devuelve true si se aplicó.
   */
  modificarSiDisponible(r) {
    const { changes } = obtenerDb()
      .prepare(
        `UPDATE reservas
         SET habitacion_id = :habitacionId, habitacion_nombre = :habitacionNombre,
             entrada = :entrada, salida = :salida, huespedes = :huespedes, noches = :noches,
             precio_noche = :precioNoche, subtotal = :subtotal, impuestos = :impuestos,
             tarifa_limpieza = :tarifaLimpieza, total = :total
         WHERE id = :id
           AND estado = :estadoLeido
           AND NOT EXISTS (
             SELECT 1 FROM reservas otra
             WHERE otra.id <> :id
               AND otra.hotel_id = reservas.hotel_id
               AND otra.habitacion_id = :habitacionId
               AND otra.estado IN ('confirmada', 'check-in')
               AND otra.entrada < :salida
               AND otra.salida > :entrada
           )`
      )
      .run({
        id: r.id,
        estadoLeido: r.estadoLeido,
        habitacionId: r.habitacionId,
        habitacionNombre: r.habitacionNombre,
        entrada: r.entrada,
        salida: r.salida,
        huespedes: r.huespedes,
        noches: r.noches,
        precioNoche: r.precioNoche,
        subtotal: r.subtotal,
        impuestos: r.impuestos,
        tarifaLimpieza: r.tarifaLimpieza,
        total: r.total,
      })
    return changes === 1
  },

  registrarModificacion({ reservaId, usuarioId, porCorreo, detalle, totalAnterior, totalNuevo }) {
    obtenerDb()
      .prepare(
        `INSERT INTO reserva_modificaciones (reserva_id, usuario_id, por_correo, detalle, total_anterior, total_nuevo)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(reservaId, usuarioId, porCorreo, detalle, totalAnterior, totalNuevo)
  },

  /**
   * Cambia el estado solo si la reserva sigue en `estadoActual` (control de concurrencia optimista).
   * Al cancelar se guarda también el cargo cobrado y quién canceló. Devuelve true si se aplicó el cambio.
   */
  cambiarEstado(id, estadoActual, estadoNuevo, fecha, cargoCancelacion = null, canceladaPor = null) {
    const columnaFecha = COLUMNA_FECHA_POR_ESTADO[estadoNuevo]
    const { changes } = obtenerDb()
      .prepare(
        `UPDATE reservas SET estado = ?, ${columnaFecha} = ?, cargo_cancelacion = COALESCE(?, cargo_cancelacion),
             cancelada_por = COALESCE(?, cancelada_por)
         WHERE id = ? AND estado = ?`
      )
      .run(estadoNuevo, fecha, cargoCancelacion, canceladaPor, id, estadoActual)
    return changes === 1
  },
}
