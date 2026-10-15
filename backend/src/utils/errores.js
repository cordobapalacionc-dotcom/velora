/** Error de dominio con código HTTP. Todo lo que no sea AppError se responde como 500. */
export class AppError extends Error {
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje)
    this.name = 'AppError'
    this.estado = estado
    this.codigo = codigo
    this.detalles = detalles
  }
}

export const errores = {
  solicitudInvalida: (mensaje, detalles) => new AppError(400, 'SOLICITUD_INVALIDA', mensaje, detalles),
  noAutenticado: (mensaje = 'Debes iniciar sesión.') => new AppError(401, 'NO_AUTENTICADO', mensaje),
  prohibido: (mensaje = 'No tienes permiso para realizar esta acción.') => new AppError(403, 'PROHIBIDO', mensaje),
  noEncontrado: (mensaje = 'Recurso no encontrado.') => new AppError(404, 'NO_ENCONTRADO', mensaje),
  conflicto: (mensaje) => new AppError(409, 'CONFLICTO', mensaje),
  reglaNegocio: (mensaje) => new AppError(422, 'REGLA_DE_NEGOCIO', mensaje),
}
