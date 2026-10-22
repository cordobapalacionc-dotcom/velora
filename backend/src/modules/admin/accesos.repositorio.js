import { obtenerDb } from '../../db/conexion.js'

// Las fechas se guardan en UTC; para agrupar por día se pasan a la hora local del servidor
// (si no, en Colombia un acceso a las 8 p. m. contaría como del día siguiente).
const DIA_LOCAL = "date(fecha, 'localtime')"

/** Primer día del periodo (incluido), p. ej. dias=14 → hoy y los 13 días anteriores. */
const inicioPeriodo = (dias) => `-${dias - 1} days`

export const accesosRepositorio = {
  registrar({ usuarioId = null, correo, tipo, exito, ip = null, navegador = null }) {
    obtenerDb()
      .prepare(
        `INSERT INTO inicios_sesion (usuario_id, correo, tipo, exito, ip, navegador)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(usuarioId, correo, tipo, exito ? 1 : 0, ip, navegador?.slice(0, 300) ?? null)
  },

  /**
   * Inicios de sesión fallidos de un correo desde `desde`, sin contar los anteriores a su último
   * acceso exitoso (entrar bien o restablecer la contraseña "limpia" el contador).
   */
  fallosRecientes(correo, desde) {
    return obtenerDb()
      .prepare(
        `SELECT COUNT(*) AS fallos, MAX(fecha) AS ultimoFallo
         FROM inicios_sesion
         WHERE correo = :correo AND tipo = 'login' AND exito = 0 AND fecha > :desde
           AND fecha > COALESCE((
             SELECT MAX(fecha) FROM inicios_sesion
             WHERE correo = :correo AND exito = 1 AND tipo IN ('login', 'restablecimiento')
           ), '')`
      )
      .get({ correo, desde })
  },

  /** Borra los registros más viejos que `dias` (son datos personales: IP y navegador). */
  purgar(dias) {
    return obtenerDb()
      .prepare(`DELETE FROM inicios_sesion WHERE fecha < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`)
      .run(`-${dias} days`).changes
  },

  resumen(dias) {
    return obtenerDb()
      .prepare(
        `SELECT
           COALESCE(SUM(tipo = 'login' AND exito = 1), 0)                  AS iniciosExitosos,
           COALESCE(SUM(tipo = 'login' AND exito = 0), 0)                  AS intentosFallidos,
           COALESCE(SUM(tipo = 'bloqueo'), 0)                              AS intentosBloqueados,
           COALESCE(SUM(tipo = 'registro' AND exito = 1), 0)               AS registros,
           COUNT(DISTINCT CASE WHEN exito = 1 THEN usuario_id END)         AS usuariosDistintos
         FROM inicios_sesion
         WHERE ${DIA_LOCAL} >= date('now', 'localtime', ?)`
      )
      .get(inicioPeriodo(dias))
  },

  /** Una fila por día del periodo, incluidos los días sin accesos (con 0). */
  porDia(dias) {
    return obtenerDb()
      .prepare(
        `WITH RECURSIVE calendario(dia) AS (
           SELECT date('now', 'localtime', ?)
           UNION ALL
           SELECT date(dia, '+1 day') FROM calendario WHERE dia < date('now', 'localtime')
         )
         SELECT c.dia,
                -- mismo criterio que el resumen: solo inicios de sesión (los registros van aparte)
                COALESCE(SUM(i.tipo = 'login' AND i.exito = 1), 0) AS exitosos,
                COALESCE(SUM(i.tipo = 'login' AND i.exito = 0), 0) AS fallidos
         FROM calendario c
         LEFT JOIN inicios_sesion i ON date(i.fecha, 'localtime') = c.dia
         GROUP BY c.dia
         ORDER BY c.dia`
      )
      .all(inicioPeriodo(dias))
  },

  /** Usuarios que entraron al menos una vez en el periodo, del acceso más reciente al más antiguo. */
  usuariosActivos(dias) {
    return obtenerDb()
      .prepare(
        `SELECT u.id, u.nombre, u.correo, u.rol,
                COUNT(i.id)  AS accesos,
                MAX(i.fecha) AS ultimoAcceso
         FROM usuarios u
         JOIN inicios_sesion i ON i.usuario_id = u.id AND i.exito = 1
         WHERE date(i.fecha, 'localtime') >= date('now', 'localtime', ?)
         GROUP BY u.id
         ORDER BY ultimoAcceso DESC`
      )
      .all(inicioPeriodo(dias))
  },

  recientes(limite) {
    return obtenerDb()
      .prepare(
        `SELECT i.id, i.correo, i.tipo, i.exito, i.ip, i.navegador, i.fecha,
                u.nombre, u.rol
         FROM inicios_sesion i
         LEFT JOIN usuarios u ON u.id = i.usuario_id
         ORDER BY i.fecha DESC, i.id DESC
         LIMIT ?`
      )
      .all(limite)
      .map((fila) => ({ ...fila, exito: fila.exito === 1 }))
  },
}
