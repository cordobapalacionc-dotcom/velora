import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Award, BadgePercent, CalendarCheck, ConciergeBell } from 'lucide-react'
import SearchBar from '../components/SearchBar.jsx'
import { destinos, colecciones, heroImagen } from './data/hotels.js'
import { obtenerHoteles } from '../services/hotelesStore.js'

const servicios = [
  {
    icono: BadgePercent,
    titulo: 'Garantía del mejor precio',
    descripcion: 'Si encuentras una mejor tarifa para la misma estadía, igualamos el precio.',
  },
  {
    icono: ConciergeBell,
    titulo: 'Conserjería 24/7',
    descripcion: 'Un equipo disponible a cualquier hora para resolver lo que necesites.',
  },
  {
    icono: CalendarCheck,
    titulo: 'Cancelación flexible',
    descripcion: 'Cambia de planes sin complicaciones en la mayoría de nuestras propiedades.',
  },
  {
    icono: Award,
    titulo: 'Recompensas por nivel de fidelidad',
    descripcion: 'Entre más viajas con nosotros, más beneficios exclusivos desbloqueas.',
  },
]

export default function Home() {
  const testimonio = obtenerHoteles().find((h) => h.testimonio)?.testimonio
  const { hash } = useLocation()

  // El enlace "Colecciones" del menú lleva a /#colecciones: se desplaza hasta esa sección.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <>
      <section
        className="hero"
        style={{ backgroundImage: `url(${heroImagen})` }}
      >
        <div className="hero__superposicion">
          <p className="hero__etiqueta">Hospitalidad selecta</p>
          <h1 className="hero__titulo">
            Escapa de lo cotidiano. Llega a un estado de pura serenidad.
          </h1>
          <SearchBar variante="hero" />
        </div>
      </section>

      <section className="seccion">
        <p className="seccion__etiqueta">Destinos curados</p>
        <div className="seccion__encabezado">
          <h2>Destinos esculpidos en tranquilidad</h2>
          <p className="seccion__descripcion">
            Explora los rincones más exclusivos del mundo, seleccionados por su belleza natural,
            su servicio impecable y su promesa de calma absoluta.
          </p>
        </div>
        <div className="grid-destinos">
          {destinos.map((d) => (
            <Link key={d.id} to={`/buscar?destino=${encodeURIComponent(d.nombre)}`} className="tarjeta-destino">
              <img src={d.imagen} alt={d.nombre} width={500} height={400} loading="lazy" />
              <span className="tarjeta-destino__nombre">{d.nombre}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="seccion seccion--clara">
        <p className="seccion__etiqueta">Por qué Velora</p>
        <h2 className="seccion__titulo-centrado">Servicio impecable en cada etapa</h2>
        <div className="grid-servicios">
          {servicios.map((s) => (
            <div key={s.titulo} className="tarjeta-servicio">
              <span className="tarjeta-servicio__icono" aria-hidden="true">
                <s.icono size={22} strokeWidth={1.5} />
              </span>
              <h3>{s.titulo}</h3>
              <p>{s.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="seccion" id="colecciones">
        <p className="seccion__etiqueta">Colecciones</p>
        <h2 className="seccion__titulo-centrado">Colecciones creadas para cada estado de ánimo</h2>
        <div className="grid-colecciones">
          {colecciones.map((c) => (
            <Link
              key={c.id}
              to={`/buscar?coleccion=${c.id}`}
              className="tarjeta-coleccion"
            >
              <img src={c.imagen} alt={c.nombre} width={500} height={400} loading="lazy" />
              <span className="tarjeta-coleccion__nombre">{c.nombre}</span>
            </Link>
          ))}
        </div>
      </section>

      {testimonio && (
        <section className="seccion seccion--testimonio">
          <div className="testimonio">
            <p className="testimonio__estrellas" aria-hidden="true">
              ★★★★★
            </p>
            <p className="testimonio__texto">"{testimonio.texto}"</p>
            <p className="testimonio__autor">{testimonio.autor}</p>
            <p className="testimonio__detalle">{testimonio.detalle}</p>
          </div>
        </section>
      )}
    </>
  )
}
