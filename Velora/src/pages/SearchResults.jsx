import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import SearchBar from '../components/SearchBar.jsx'
import HotelCard from '../components/HotelCard.jsx'
import { buscarHoteles } from '../services/hotelesStore.js'
import { colecciones, destinos } from './data/hotels.js'

const RANGOS_PRECIO = [
  { id: 'bajo', etiqueta: 'Menos de $1.500.000', cumple: (p) => p < 1_500_000 },
  { id: 'medio', etiqueta: '$1.500.000 – $3.000.000', cumple: (p) => p >= 1_500_000 && p <= 3_000_000 },
  { id: 'alto', etiqueta: 'Más de $3.000.000', cumple: (p) => p > 3_000_000 },
]

const CALIFICACIONES = [
  { valor: 4.5, etiqueta: '4.5 o más' },
  { valor: 4.0, etiqueta: '4.0 o más' },
]

// El país es la última parte de la ubicación: "Salento, Eje Cafetero, Colombia" → "Colombia"
const paisDe = (hotel) => hotel.ubicacion.split(',').pop().trim()

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const destino = searchParams.get('destino') ?? ''
  const entrada = searchParams.get('entrada') ?? ''
  const salida = searchParams.get('salida') ?? ''
  const huespedes = searchParams.get('huespedes') ?? '2'
  const coleccion = colecciones.find((c) => c.id === searchParams.get('coleccion'))

  const [orden, setOrden] = useState('recomendado')
  const [rangos, setRangos] = useState([])
  const [calificacionMinima, setCalificacionMinima] = useState(null)
  const [paises, setPaises] = useState([])

  // Hoteles que cumplen la búsqueda (destino + colección), antes de aplicar los filtros laterales.
  const base = useMemo(() => {
    const encontrados = buscarHoteles(destino)
    return coleccion ? encontrados.filter((h) => h.colecciones?.includes(coleccion.id)) : encontrados
  }, [destino, coleccion])

  const paisesDisponibles = useMemo(() => [...new Set(base.map(paisDe))].sort(), [base])

  const resultados = useMemo(() => {
    const filtrados = base.filter(
      (h) =>
        (rangos.length === 0 || RANGOS_PRECIO.some((r) => rangos.includes(r.id) && r.cumple(h.precioNoche))) &&
        (calificacionMinima === null || h.calificacion >= calificacionMinima) &&
        (paises.length === 0 || paises.includes(paisDe(h)))
    )
    if (orden === 'precio-asc') filtrados.sort((a, b) => a.precioNoche - b.precioNoche)
    if (orden === 'precio-desc') filtrados.sort((a, b) => b.precioNoche - a.precioNoche)
    if (orden === 'calificacion') filtrados.sort((a, b) => b.calificacion - a.calificacion)
    return filtrados
  }, [base, rangos, calificacionMinima, paises, orden])

  const hayFiltros = rangos.length > 0 || calificacionMinima !== null || paises.length > 0

  function alternar(lista, setLista, valor) {
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor])
  }

  function limpiarFiltros() {
    setRangos([])
    setCalificacionMinima(null)
    setPaises([])
  }

  let titulo = 'Todos los hoteles'
  if (coleccion) titulo = coleccion.nombre
  else if (destino) titulo = `Hoteles en ${destino}`

  return (
    <div className="pagina-resultados">
      <div className="pagina-resultados__busqueda">
        <SearchBar variante="barra" valoresIniciales={{ destino, entrada, salida, huespedes }} />
      </div>

      <div className="pagina-resultados__contenido">
        <aside className="filtros" aria-label="Filtros">
          <div className="filtros__encabezado">
            <h3>Filtros</h3>
            {hayFiltros && (
              <button type="button" className="filtros__limpiar" onClick={limpiarFiltros}>
                Limpiar
              </button>
            )}
          </div>

          <fieldset className="filtros__grupo">
            <legend>Precio por noche (COP)</legend>
            <div className="filtros__opciones">
              {RANGOS_PRECIO.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    checked={rangos.includes(r.id)}
                    onChange={() => alternar(rangos, setRangos, r.id)}
                  />
                  {r.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="filtros__grupo">
            <legend>Calificación</legend>
            <div className="filtros__opciones">
              {CALIFICACIONES.map((c) => (
                <label key={c.valor}>
                  <input
                    type="radio"
                    name="calificacion"
                    checked={calificacionMinima === c.valor}
                    onChange={() => setCalificacionMinima(c.valor)}
                  />
                  {c.etiqueta}
                </label>
              ))}
              <label>
                <input
                  type="radio"
                  name="calificacion"
                  checked={calificacionMinima === null}
                  onChange={() => setCalificacionMinima(null)}
                />
                Cualquiera
              </label>
            </div>
          </fieldset>

          {paisesDisponibles.length > 1 && (
            <fieldset className="filtros__grupo">
              <legend>País</legend>
              <div className="filtros__opciones">
                {paisesDisponibles.map((p) => (
                  <label key={p}>
                    <input
                      type="checkbox"
                      checked={paises.includes(p)}
                      onChange={() => alternar(paises, setPaises, p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </aside>

        <main className="resultados">
          <div className="resultados__encabezado">
            <div>
              {coleccion && <p className="seccion__etiqueta">Colección</p>}
              <h1>{titulo}</h1>
              <p aria-live="polite">
                {resultados.length} {resultados.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
              </p>
              {coleccion && (
                <Link to="/buscar" className="resultados__coleccion enlace-boton">
                  Ver todos los hoteles
                </Link>
              )}
            </div>
            <label className="resultados__orden">
              Ordenar por
              <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="recomendado">Recomendado</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
                <option value="calificacion">Mejor calificados</option>
              </select>
            </label>
          </div>

          {resultados.length === 0 ? (
            <div className="estado-vacio">
              <span className="estado-vacio__icono" aria-hidden="true">
                <SearchX size={26} strokeWidth={1.5} />
              </span>
              {hayFiltros ? (
                <>
                  <h2>Ningún hotel cumple estos filtros</h2>
                  <p>Prueba quitando alguno de los filtros para ver más opciones.</p>
                  <button type="button" className="btn btn--dorado" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <>
                  <h2>No encontramos hoteles{destino ? ` para "${destino}"` : ''}</h2>
                  <p>Revisa cómo está escrito o explora alguno de nuestros destinos:</p>
                  <div className="estado-vacio__sugerencias">
                    {destinos.map((d) => (
                      <Link key={d.id} to={`/buscar?destino=${encodeURIComponent(d.nombre)}`} className="chip">
                        {d.nombre}
                      </Link>
                    ))}
                  </div>
                  <Link to="/buscar" className="btn btn--fantasma">
                    Ver todos los hoteles
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="resultados__lista">
              {resultados.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  orientacion="horizontal"
                  entrada={entrada}
                  salida={salida}
                  huespedes={huespedes}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
