import { useRef, useState } from 'react'
import { api } from '../services/api.js'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 5

// Campo de imagen para los formularios del panel: sube un archivo al backend o acepta una URL.
// En ambos casos `valor` termina siendo una URL, que es lo que se guarda. El backend convierte
// la imagen a WebP en tres tamaños y le quita los metadatos (como la ubicación GPS).
export default function SubirImagen({ valor, onCambio, etiqueta = 'Imagen' }) {
  const selectorArchivo = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function manejarArchivo(evento) {
    const archivo = evento.target.files?.[0]
    evento.target.value = '' // permite volver a elegir el mismo archivo después de un error
    if (!archivo) return
    setError('')

    // Revisión rápida en el navegador; el backend vuelve a validar el contenido real del archivo.
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError('Elige una imagen JPG, PNG o WebP.')
      return
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_MB} MB.`)
      return
    }

    setSubiendo(true)
    try {
      onCambio(await api.imagenes.subir(archivo))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="form-hotel__ancho-completo subir-imagen">
      <span className="subir-imagen__etiqueta">{etiqueta}</span>
      <div className="subir-imagen__cuerpo">
        <div className="subir-imagen__vista">{valor ? <img src={valor} alt="Vista previa de la imagen" /> : <span>Sin imagen</span>}</div>

        <div className="subir-imagen__controles">
          <div className="subir-imagen__fila">
            <button type="button" className="btn btn--fantasma" onClick={() => selectorArchivo.current?.click()} disabled={subiendo}>
              {subiendo ? 'Subiendo…' : valor ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            {valor && !subiendo && (
              <button type="button" className="subir-imagen__quitar" onClick={() => onCambio('')}>
                Quitar
              </button>
            )}
          </div>
          <span className="subir-imagen__ayuda">JPG, PNG o WebP · máximo {MAX_MB} MB · se optimiza automáticamente</span>
          <input ref={selectorArchivo} type="file" accept={TIPOS_PERMITIDOS.join(',')} onChange={manejarArchivo} hidden />

          <label>
            O pega una URL
            <input type="url" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder="https://..." />
          </label>

          {error && <p className="pagina-login__error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
