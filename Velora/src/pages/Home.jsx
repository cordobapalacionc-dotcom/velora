import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Award, BadgePercent, CalendarCheck, ConciergeBell } from 'lucide-react'
import Imagen from '../components/Imagen.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'
import { HERO_IMAGEN } from '../utils/imagenes.js'

const SERVICIOS = [
  { icono: BadgePercent, clave: 'precio' },
  { icono: ConciergeBell, clave: 'conserjeria' },
  { icono: CalendarCheck, clave: 'cancelacion' },
  { icono: Award, clave: 'recompensas' },
]

export default function Home() {
  const { destinos, colecciones, configuracion } = useCatalogo()
  const { t, tr } = useIdioma()
  const { datos: hoteles } = useConsulta('hoteles', () => api.hoteles.listar())
  const hotelConTestimonio = hoteles?.find((h) => h.testimonio)
  const testimonio = hotelConTestimonio && (tr(hotelConTestimonio, 'testimonio') || hotelConTestimonio.testimonio)
  const { hash } = useLocation()

  // El enlace "Colecciones" del menú lleva a /#colecciones: se desplaza hasta esa sección.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <>
      <section className="hero">
        {/* La imagen mide al menos 620 px de alto (16:9 → 1100 px de ancho): en celular también se pide grande. */}
        <Imagen className="hero__fondo" src={HERO_IMAGEN} alt="" sizes="(max-width: 1100px) 1100px, 100vw" prioridad />
        <div className="hero__superposicion">
          <p className="hero__etiqueta">{t('inicio.etiqueta')}</p>
          <h1 className="hero__titulo">{t('inicio.titulo')}</h1>
          <SearchBar variante="hero" />
        </div>
      </section>

      <section className="seccion">
        <p className="seccion__etiqueta">{t('inicio.destinosEtiqueta')}</p>
        <div className="seccion__encabezado">
          <h2>{t('inicio.destinosTitulo')}</h2>
          <p className="seccion__descripcion">{t('inicio.destinosDescripcion')}</p>
        </div>
        <div className="grid-destinos">
          {destinos.map((d) => (
            <Link key={d.id} to={`/buscar?destino=${encodeURIComponent(tr(d, 'nombre'))}`} className="tarjeta-destino">
              <Imagen src={d.imagen} alt="" width={500} height={400} sizes="(max-width: 720px) 100vw, 220px" />
              <span className="tarjeta-destino__nombre">{tr(d, 'nombre')}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="seccion seccion--clara">
        <p className="seccion__etiqueta">{t('inicio.porQueEtiqueta')}</p>
        <h2 className="seccion__titulo-centrado">{t('inicio.porQueTitulo')}</h2>
        <div className="grid-servicios">
          {SERVICIOS.map((s) => (
            <div key={s.clave} className="tarjeta-servicio">
              <span className="tarjeta-servicio__icono" aria-hidden="true">
                <s.icono size={22} strokeWidth={1.5} />
              </span>
              <h3>{t(`inicio.servicio.${s.clave}.titulo`)}</h3>
              <p>{t(`inicio.servicio.${s.clave}.texto`, { horas: configuracion.cancelacionGratisDias * 24 })}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="seccion" id="colecciones">
        <p className="seccion__etiqueta">{t('inicio.coleccionesEtiqueta')}</p>
        <h2 className="seccion__titulo-centrado">{t('inicio.coleccionesTitulo')}</h2>
        <div className="grid-colecciones">
          {colecciones.map((c) => (
            <Link key={c.id} to={`/buscar?coleccion=${c.id}`} className="tarjeta-coleccion">
              <Imagen src={c.imagen} alt="" width={500} height={400} sizes="(max-width: 720px) 100vw, 400px" />
              <span className="tarjeta-coleccion__nombre">{tr(c, 'nombre')}</span>
            </Link>
          ))}
        </div>
      </section>

      {testimonio && (
        <section className="seccion seccion--testimonio">
          <figure className="testimonio">
            <p className="testimonio__estrellas" aria-hidden="true">
              ★★★★★
            </p>
            <blockquote className="testimonio__texto">"{testimonio.texto}"</blockquote>
            <figcaption>
              <p className="testimonio__autor">{testimonio.autor}</p>
              <p className="testimonio__detalle">{testimonio.detalle}</p>
            </figcaption>
          </figure>
        </section>
      )}
    </>
  )
}
