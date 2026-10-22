import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import Cargando, { ErrorCarga } from '../components/Cargando.jsx'
import HotelCard from '../components/HotelCard.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'

// Rangos en pesos (la moneda en que se cobra); las etiquetas se muestran en la moneda elegida.
const RANGOS_PRECIO = [
  { id: 'bajo', hasta: 1_500_000, cumple: (p) => p < 1_500_000 },
  { id: 'medio', desde: 1_500_000, hasta: 3_000_000, cumple: (p) => p >= 1_500_000 && p <= 3_000_000 },
  { id: 'alto', desde: 3_000_000, cumple: (p) => p > 3_000_000 },
]

const CALIFICACIONES = [4.5, 4.0]

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const { colecciones, destinos } = useCatalogo()
  const { t, tr, precio } = useIdioma()
  const destino = searchParams.get('destino') ?? ''
  const entrada = searchParams.get('entrada') ?? ''
  const salida = searchParams.get('salida') ?? ''
  const huespedes = searchParams.get('huespedes') ?? '2'
  const coleccionId = searchParams.get('coleccion') ?? ''
  const coleccion = colecciones.find((c) => c.id === coleccionId)

  const [orden, setOrden] = useState('recomendado')
  const [rangos, setRangos] = useState([])
  const [calificacionMinima, setCalificacionMinima] = useState(null)
  const [paises, setPaises] = useState([])

  // Hoteles que cumplen la búsqueda (destino, colección y capacidad) según el backend.
  const filtrosApi = { destino, coleccion: coleccionId, huespedes }
  const { datos: base, error, cargando, recargar } = useConsulta(`hoteles:${JSON.stringify(filtrosApi)}`, () =>
    api.hoteles.listar(filtrosApi)
  )

  const paisDe = (hotel) => tr(hotel.destino, 'pais')
  // Son pocos hoteles: filtrar y ordenar en cada render es instantáneo.
  const paisesDisponibles = [...new Set((base ?? []).map(paisDe))].sort()

  const resultados = (() => {
    const filtrados = (base ?? []).filter(
      (h) =>
        (rangos.length === 0 || RANGOS_PRECIO.some((r) => rangos.includes(r.id) && r.cumple(h.precioNoche))) &&
        (calificacionMinima === null || h.calificacion >= calificacionMinima) &&
        (paises.length === 0 || paises.includes(paisDe(h)))
    )
    if (orden === 'precio-asc') filtrados.sort((a, b) => a.precioNoche - b.precioNoche)
    if (orden === 'precio-desc') filtrados.sort((a, b) => b.precioNoche - a.precioNoche)
    if (orden === 'calificacion') filtrados.sort((a, b) => b.calificacion - a.calificacion)
    return filtrados
  })()

  const hayFiltros = rangos.length > 0 || calificacionMinima !== null || paises.length > 0

  function alternar(lista, setLista, valor) {
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor])
  }

  function limpiarFiltros() {
    setRangos([])
    setCalificacionMinima(null)
    setPaises([])
  }

  function etiquetaRango(r) {
    if (!r.desde) return t('resultados.menosDe', { valor: precio(r.hasta) })
    if (!r.hasta) return t('resultados.masDe', { valor: precio(r.desde) })
    return `${precio(r.desde)} – ${precio(r.hasta)}`
  }

  let titulo = t('resultados.todos')
  if (coleccion) titulo = tr(coleccion, 'nombre')
  else if (destino) titulo = t('resultados.en', { destino })

  return (
    <div className="pagina-resultados">
      <div className="pagina-resultados__busqueda">
        <SearchBar variante="barra" valoresIniciales={{ destino, entrada, salida, huespedes }} />
      </div>

      <div className="pagina-resultados__contenido">
        <aside className="filtros" aria-label={t('resultados.filtros')}>
          <div className="filtros__encabezado">
            <h2>{t('resultados.filtros')}</h2>
            {hayFiltros && (
              <button type="button" className="filtros__limpiar" onClick={limpiarFiltros}>
                {t('resultados.limpiar')}
              </button>
            )}
          </div>

          <fieldset className="filtros__grupo">
            <legend>{t('resultados.precioPorNoche')}</legend>
            <div className="filtros__opciones">
              {RANGOS_PRECIO.map((r) => (
                <label key={r.id}>
                  <input type="checkbox" checked={rangos.includes(r.id)} onChange={() => alternar(rangos, setRangos, r.id)} />
                  {etiquetaRango(r)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="filtros__grupo">
            <legend>{t('resultados.calificacion')}</legend>
            <div className="filtros__opciones">
              {CALIFICACIONES.map((valor) => (
                <label key={valor}>
                  <input
                    type="radio"
                    name="calificacion"
                    checked={calificacionMinima === valor}
                    onChange={() => setCalificacionMinima(valor)}
                  />
                  {t('resultados.oMas', { valor: valor.toFixed(1) })}
                </label>
              ))}
              <label>
                <input type="radio" name="calificacion" checked={calificacionMinima === null} onChange={() => setCalificacionMinima(null)} />
                {t('resultados.cualquiera')}
              </label>
            </div>
          </fieldset>

          {paisesDisponibles.length > 1 && (
            <fieldset className="filtros__grupo">
              <legend>{t('resultados.pais')}</legend>
              <div className="filtros__opciones">
                {paisesDisponibles.map((p) => (
                  <label key={p}>
                    <input type="checkbox" checked={paises.includes(p)} onChange={() => alternar(paises, setPaises, p)} />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </aside>

        <section className="resultados" aria-busy={cargando}>
          <div className="resultados__encabezado">
            <div>
              {coleccion && <p className="seccion__etiqueta">{t('resultados.coleccion')}</p>}
              <h1>{titulo}</h1>
              <p aria-live="polite">
                {base ? t(resultados.length === 1 ? 'resultados.encontrada' : 'resultados.encontradas', { n: resultados.length }) : ''}
              </p>
              {coleccion && (
                <Link to="/buscar" className="resultados__coleccion enlace-boton">
                  {t('resultados.verTodos')}
                </Link>
              )}
            </div>
            <label className="resultados__orden">
              {t('resultados.ordenar')}
              <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="recomendado">{t('resultados.orden.recomendado')}</option>
                <option value="precio-asc">{t('resultados.orden.precioAsc')}</option>
                <option value="precio-desc">{t('resultados.orden.precioDesc')}</option>
                <option value="calificacion">{t('resultados.orden.calificacion')}</option>
              </select>
            </label>
          </div>

          {error ? (
            <ErrorCarga error={error} onReintentar={recargar} />
          ) : !base ? (
            <Cargando texto={t('resultados.buscando')} />
          ) : resultados.length === 0 ? (
            <div className="estado-vacio">
              <span className="estado-vacio__icono" aria-hidden="true">
                <SearchX size={26} strokeWidth={1.5} />
              </span>
              {hayFiltros ? (
                <>
                  <h2>{t('resultados.sinFiltros')}</h2>
                  <p>{t('resultados.sinFiltrosTexto')}</p>
                  <button type="button" className="btn btn--dorado" onClick={limpiarFiltros}>
                    {t('resultados.limpiarFiltros')}
                  </button>
                </>
              ) : (
                <>
                  <h2>{destino ? t('resultados.sinHotelesPara', { destino }) : t('resultados.sinHoteles')}</h2>
                  <p>{t('resultados.sugerencia')}</p>
                  <div className="estado-vacio__sugerencias">
                    {destinos.map((d) => (
                      <Link key={d.id} to={`/buscar?destino=${encodeURIComponent(tr(d, 'nombre'))}`} className="chip">
                        {tr(d, 'nombre')}
                      </Link>
                    ))}
                  </div>
                  <Link to="/buscar" className="btn btn--fantasma">
                    {t('resultados.verTodos')}
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="resultados__lista">
              {resultados.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} orientacion="horizontal" entrada={entrada} salida={salida} huespedes={huespedes} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
