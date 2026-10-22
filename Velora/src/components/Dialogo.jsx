import { useEffect, useId, useRef } from 'react'

/**
 * Cuadro modal con <dialog> nativo: bloquea el resto de la página, cierra con Escape
 * y mantiene el foco dentro. `onCerrar` se llama al cerrarlo por cualquier vía.
 */
export default function Dialogo({ titulo, etiqueta, subtitulo, onCerrar, children, ancho = 'normal' }) {
  const dialogo = useRef(null)
  const idTitulo = useId()

  // Sin limpieza a propósito: llamar a close() al desmontar dispararía onCerrar (y en modo estricto
  // React monta dos veces, lo que cerraría el cuadro recién abierto). Al quitarlo del DOM ya se va.
  useEffect(() => {
    if (!dialogo.current?.open) dialogo.current?.showModal()
  }, [])

  return (
    <dialog ref={dialogo} className={`dialogo dialogo--${ancho}`} aria-labelledby={idTitulo} onClose={onCerrar}>
      <div className="dialogo__contenido">
        <header className="dialogo__encabezado">
          <div>
            {etiqueta && <p className="seccion__etiqueta">{etiqueta}</p>}
            <h2 id={idTitulo}>{titulo}</h2>
            {subtitulo && <p className="dialogo__subtitulo">{subtitulo}</p>}
          </div>
        </header>
        {children}
      </div>
    </dialog>
  )
}

/** Cierra el <dialog> que contiene al botón (dispara su onClose). */
export function cerrarDialogo(evento) {
  evento.currentTarget.closest('dialog')?.close()
}
