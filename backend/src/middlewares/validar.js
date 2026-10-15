import { errores } from '../utils/errores.js'

/**
 * Valida body, query y params contra esquemas Zod. Los datos ya limpios quedan en
 * `req.validado`; los controladores solo deben leer de ahí, nunca de req.body directamente.
 */
export function validar(esquemas) {
  return (req, _res, next) => {
    req.validado = {}
    const problemas = []

    for (const parte of ['params', 'query', 'body']) {
      const esquema = esquemas[parte]
      if (!esquema) continue
      const resultado = esquema.safeParse(req[parte] ?? {})
      if (resultado.success) {
        req.validado[parte] = resultado.data
      } else {
        for (const issue of resultado.error.issues) {
          problemas.push({ campo: [parte, ...issue.path].join('.'), mensaje: issue.message })
        }
      }
    }

    if (problemas.length) return next(errores.solicitudInvalida('Los datos enviados no son válidos.', problemas))
    next()
  }
}
