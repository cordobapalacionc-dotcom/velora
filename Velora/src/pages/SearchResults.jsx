import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar.jsx'
import HotelCard from '../components/HotelCard.jsx'
import { buscarHoteles } from '../services/hotelesStore.js'

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const destino = searchParams.get('destino') ?? ''
  const entrada = searchParams.get('entrada') ?? ''
  const salida = searchParams.get('salida') ?? ''
  const huespedes = searchParams.get('huespedes') ?? '2'

  const [orden, setOrden] = useState('recomendado')

  const resultados = useMemo(() => {
    const base = buscarHoteles(destino)
    const copia = [...base]
    if (orden === 'precio-asc') copia.sort((a, b) => a.precioNoche - b.precioNoche)
    if (orden === 'precio-desc') copia.sort((a, b) => b.precioNoche - a.precioNoche)
    if (orden === 'calificacion') copia.sort((a, b) => b.calificacion - a.calificacion)
    return copia
  }, [destino, orden])

  return (
    <div className="pagina-resultados">
      <div className="pagina-resultados__busqueda">
        <SearchBar
          variante="barra"
          valoresIniciales={{ destino, entrada, salida, huespedes }}
        />
      </div>

      <div className="pagina-resultados__contenido">
        <aside className="filtros">
          <h3>Filtros</h3>

          <div className="filtros__grupo">
            <span>Rango de precio (COP / noche)</span>
            <div className="filtros__opciones">
              <label>
                <input type="checkbox" /> Menos de $1.500.000
              </label>
              <label>
                <input type="checkbox" /> $1.500.000 – $3.000.000
              </label>
              <label>
                <input type="checkbox" /> Más de $3.000.000
              </label>
            </div>
          </div>

          <div className="filtros__grupo">
            <span>Calificación</span>
            <div className="filtros__opciones">
              <label>
                <input type="checkbox" /> 4.5 o más
              </label>
              <label>
                <input type="checkbox" /> 4.0 o más
              </label>
            </div>
          </div>

          <div className="filtros__grupo">
            <span>Tipo de propiedad</span>
            <div className="filtros__opciones">
              <label>
                <input type="checkbox" /> Villa
              </label>
              <label>
                <input type="checkbox" /> Suite
              </label>
              <label>
                <input type="checkbox" /> Cabaña
              </label>
            </div>
          </div>
        </aside>

        <main className="resultados">
          <div className="resultados__encabezado">
            <div>
              <h1>{destino ? `Hoteles en ${destino}` : 'Todos los destinos'}</h1>
              <p>{resultados.length} propiedades encontradas</p>
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
            <p className="resultados__vacio">
              No encontramos hoteles para "{destino}". Intenta con otro destino.
            </p>
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

        <aside className="mapa-lateral" aria-label="Mapa de ubicación de resultados">
          <div className="mapa-lateral__marco">
            <span>Mapa interactivo</span>
            <p>Próximamente podrás ver la ubicación exacta de cada propiedad.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
