import { useEffect, useEffectEvent, useState } from 'react'

/**
 * Pide datos a la API y los guarda junto con la clave de la consulta que los pidió.
 * - `clave`: identifica la consulta (p. ej. `hotel:${id}`). Si cambia, se vuelve a pedir; null = no pedir.
 * - Mientras se recarga la MISMA consulta se siguen mostrando los datos anteriores (sin parpadeo);
 *   si la clave es otra (otro hotel), no se muestran datos viejos.
 * "cargando" se deduce comparando claves, sin cambiar estado de forma síncrona dentro del efecto.
 */
export function useConsulta(clave, cargar) {
  const [recarga, setRecarga] = useState(0)
  const [respuesta, setRespuesta] = useState({ clave: null, base: null, datos: undefined, error: null })
  const claveCompleta = clave === null ? null : `${clave}#${recarga}`
  const pedir = useEffectEvent(() => cargar())

  useEffect(() => {
    if (claveCompleta === null) return
    let vigente = true
    pedir().then(
      (datos) => vigente && setRespuesta({ clave: claveCompleta, base: clave, datos, error: null }),
      (error) =>
        vigente &&
        setRespuesta((anterior) => ({
          clave: claveCompleta,
          base: clave,
          datos: anterior.base === clave ? anterior.datos : undefined,
          error,
        }))
    )
    return () => {
      vigente = false
    }
  }, [claveCompleta, clave])

  const cargando = claveCompleta !== null && respuesta.clave !== claveCompleta
  return {
    datos: respuesta.base === clave ? respuesta.datos : undefined,
    error: cargando ? null : respuesta.error,
    cargando,
    recargar: () => setRecarga((n) => n + 1),
  }
}
