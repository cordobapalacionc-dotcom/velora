import { obtenerDb } from '../../db/conexion.js'

const COLUMNAS_PUBLICAS = 'id, nombre, correo, rol, creado_en AS creadoEn'

export const usuariosRepositorio = {
  buscarPorId(id) {
    return obtenerDb().prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`).get(id) ?? null
  },

  /** Incluye la versión de sesión: solo para validar tokens. */
  buscarParaSesion(id) {
    return obtenerDb().prepare(`SELECT ${COLUMNAS_PUBLICAS}, sesion_version AS sesionVersion FROM usuarios WHERE id = ?`).get(id) ?? null
  },

  /** Incluye el hash: solo debe usarse para verificar credenciales. */
  buscarConHashPorCorreo(correo) {
    return (
      obtenerDb()
        .prepare(
          `SELECT ${COLUMNAS_PUBLICAS}, contrasena_hash AS contrasenaHash, sesion_version AS sesionVersion
           FROM usuarios WHERE correo = ?`
        )
        .get(correo) ?? null
    )
  },

  existeCorreo(correo) {
    return Boolean(obtenerDb().prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo))
  },

  crear({ nombre, correo, contrasenaHash, rol }) {
    const { lastInsertRowid } = obtenerDb()
      .prepare('INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)')
      .run(nombre, correo, contrasenaHash, rol)
    return this.buscarParaSesion(Number(lastInsertRowid))
  },

  /** Cambia la contraseña y sube la versión de sesión: los tokens emitidos antes dejan de valer. */
  cambiarContrasena(id, contrasenaHash) {
    obtenerDb()
      .prepare('UPDATE usuarios SET contrasena_hash = ?, sesion_version = sesion_version + 1 WHERE id = ?')
      .run(contrasenaHash, id)
    return this.buscarParaSesion(id)
  },

  // ---- Restablecimiento de contraseña ----

  crearRestablecimiento(usuarioId, tokenHash, expira) {
    const db = obtenerDb()
    // Solo vale el último enlace pedido: los anteriores sin usar se descartan.
    db.prepare('DELETE FROM restablecimientos WHERE usuario_id = ? AND usado_en IS NULL').run(usuarioId)
    db.prepare('INSERT INTO restablecimientos (usuario_id, token_hash, expira) VALUES (?, ?, ?)').run(usuarioId, tokenHash, expira)
  },

  /** Marca el enlace como usado solo si sigue vigente; devuelve el id del usuario o null. */
  consumirRestablecimiento(tokenHash, ahora) {
    const fila = obtenerDb()
      .prepare(
        `UPDATE restablecimientos SET usado_en = ?
         WHERE token_hash = ? AND usado_en IS NULL AND expira > ?
         RETURNING usuario_id AS usuarioId`
      )
      .get(ahora, tokenHash, ahora)
    return fila?.usuarioId ?? null
  },
}
