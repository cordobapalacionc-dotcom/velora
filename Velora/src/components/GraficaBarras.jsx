import { useState } from 'react'

/**
 * Gráfica de barras verticales de una sola serie (sin leyenda: el título la nombra).
 * Barra con tooltip al pasar el mouse o con el foco del teclado, y los mismos datos en una tabla.
 * datos: [{ clave, etiqueta, etiquetaCorta?, valor, detalle?: string[] }]
 */
export default function GraficaBarras({ titulo, datos, formato = String, nombreValor, columnasTabla }) {
  const [activo, setActivo] = useState(null)
  // La escala llega al valor más alto (no a un tope fijo): con 0,4 % de ocupación las barras siguen viéndose.
  // Si todo es 0, se usa 1 para no dividir entre cero.
  const maximo = Math.max(0, ...datos.map((d) => d.valor)) || 1
  // Solo se rotula una barra de cada N, contando desde la última hacia atrás: así los rótulos
  // no se enciman ni en un celular de 320 px.
  const n = datos.length
  const cadaCuanto = n > 14 ? 7 : n > 7 ? 3 : n > 4 ? 2 : 1
  const conRotulo = (i) => (n - 1 - i) % cadaCuanto === 0

  return (
    <figure className="grafica">
      <figcaption className="grafica__titulo">{titulo}</figcaption>
      <div className="grafica__area" onMouseLeave={() => setActivo(null)}>
        <span className="grafica__maximo">{formato(maximo)}</span>
        <div className="grafica__barras" role="list">
          {datos.map((d, i) => (
            <div
              key={d.clave}
              role="listitem"
              tabIndex={0}
              className="grafica__columna"
              aria-label={`${d.etiqueta}: ${formato(d.valor)}${d.detalle?.length ? `, ${d.detalle.join(', ')}` : ''}`}
              onMouseEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
            >
              <div
                className={`grafica__barra ${activo === i ? 'grafica__barra--activa' : ''}`}
                style={{ height: `${(d.valor / maximo) * 100}%` }}
              />
              {activo === i && (
                <div role="tooltip" className={`grafica__tooltip ${i < 2 ? 'grafica__tooltip--izq' : i > n - 3 ? 'grafica__tooltip--der' : ''}`}>
                  <strong>{d.etiqueta}</strong>
                  <span>
                    {formato(d.valor)} {nombreValor}
                  </span>
                  {d.detalle?.map((linea) => (
                    <span key={linea}>{linea}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grafica__ejex" aria-hidden="true">
        {datos.map((d, i) => (
          <span key={d.clave}>{conRotulo(i) && <em>{d.etiquetaCorta ?? d.etiqueta}</em>}</span>
        ))}
      </div>
      <details className="grafica__tabla">
        <summary>Ver los datos en una tabla</summary>
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                {columnasTabla.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.clave}>
                  <td>{d.etiqueta}</td>
                  <td>{formato(d.valor)}</td>
                  {d.detalle?.map((linea) => (
                    <td key={linea}>{linea.replace(/^[^:]*:\s*/, '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
