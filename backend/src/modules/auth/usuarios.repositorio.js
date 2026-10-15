import { obtenerDb } from '../../db/conexion.js'

const COLUMNAS_PUBLICAS = 'id, nombre, correo, rol, creado_en AS creadoEn'

export const usuariosRepositorio = {
  buscarPorId(id) {
    return obtenerDb().prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`).get(id) ?? null
  },

  /** Incluye el hash: solo debe usarse para verificar credenciales. */
  buscarConHashPorCorreo(correo) {
    return (
      obtenerDb()
        .prepare(`SELECT ${COLUMNAS_PUBLICAS}, contrasena_hash AS contrasenaHash FROM usuarios WHERE correo = ?`)
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
    return this.buscarPorId(Number(lastInsertRowid))
  },
}
