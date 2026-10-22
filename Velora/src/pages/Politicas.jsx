import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'

/** Política de cancelación y de privacidad (tratamiento de datos personales, Ley 1581 de 2012). */
export default function Politicas() {
  const { configuracion } = useCatalogo()
  const { t } = useIdioma()
  const { hash } = useLocation()
  const variables = {
    horas: configuracion.cancelacionGratisDias * 24,
    dias: configuracion.retencionAccesosDias,
    iva: Math.round(configuracion.impuestosPorcentaje * 100),
  }

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  const parrafos = (prefijo, cantidad) =>
    Array.from({ length: cantidad }, (_, i) => <p key={i}>{t(`${prefijo}.p${i + 1}`, variables)}</p>)

  return (
    <div className="pagina-politicas">
      <p className="seccion__etiqueta">{t('politicas.etiqueta')}</p>
      <h1>{t('politicas.titulo')}</h1>

      <section id="cancelacion" className="tarjeta-seccion">
        <h2>{t('politicas.cancelacion.titulo')}</h2>
        {parrafos('politicas.cancelacion', 4)}
      </section>

      <section id="privacidad" className="tarjeta-seccion">
        <h2>{t('politicas.privacidad.titulo')}</h2>
        {parrafos('politicas.privacidad', 5)}
      </section>
    </div>
  )
}
