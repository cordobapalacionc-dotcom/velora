import { useState } from 'react'
import { BedDouble, CalendarX2, ChartColumn, CircleDollarSign, Percent, RefreshCw, Tag } from 'lucide-react'
import { ErrorCarga } from '../../components/Cargando.jsx'
import GraficaBarras from '../../components/GraficaBarras.jsx'
import { useConsulta } from '../../hooks/useConsulta.js'
import { api } from '../../services/api.js'
import { hoyLocal, sumarDias } from '../../utils/fechas.js'

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const copCompacto = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 })
const porcentaje = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 })
const formatoDia = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const formatoMes = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatoMesCorto = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })

const primeroDeMes = (fecha, meses = 0) => {
  const d = new Date(`${fecha.slice(0, 7)}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + meses)
  return d.toISOString().slice(0, 10)
}

// Periodos [desde, hasta): "hasta" no se incluye.
const PERIODOS = {
  'este-mes': { etiqueta: 'Este mes', rango: (hoy) => [primeroDeMes(hoy), primeroDeMes(hoy, 1)] },
  'proximos-30': { etiqueta: 'Próximos 30 días', rango: (hoy) => [hoy, sumarDias(hoy, 30)] },
  'ultimos-90': { etiqueta: 'Últimos 90 días', rango: (hoy) => [sumarDias(hoy, -89), sumarDias(hoy, 1)] },
  'proximos-12-meses': { etiqueta: 'Próximos 12 meses', rango: (hoy) => [primeroDeMes(hoy), primeroDeMes(hoy, 12)] },
  'este-anio': { etiqueta: 'Este año', rango: (hoy) => [`${hoy.slice(0, 4)}-01-01`, `${Number(hoy.slice(0, 4)) + 1}-01-01`] },
}

function Indicador({ icono: Icono, etiqueta, valor, nota }) {
  return (
    <div className="dashboard__stat">
      <span className="icono-en-linea">
        <Icono size={14} aria-hidden="true" /> {etiqueta}
      </span>
      <strong>{valor}</strong>
      {nota && <small className="dashboard__stat-nota">{nota}</small>}
    </div>
  )
}

export default function AdminMetricas() {
  const [periodo, setPeriodo] = useState('este-mes')
  const [desde, hasta] = PERIODOS[periodo].rango(hoyLocal())
  const { datos, error, cargando, recargar } = useConsulta(`metricas:${desde}:${hasta}`, () => api.admin.metricas(desde, hasta))

  const porMes = datos?.agrupacion === 'mes'
  const etiquetar = (p) => (porMes ? formatoMes.format(new Date(`${p}-01T00:00:00Z`)) : formatoDia.format(new Date(`${p}T00:00:00Z`)))
  const etiquetarCorto = (p) => (porMes ? formatoMesCorto.format(new Date(`${p}-01T00:00:00Z`)) : formatoDia.format(new Date(`${p}T00:00:00Z`)))
  const r = datos?.resumen

  return (
    <section className="dashboard__seccion" aria-busy={cargando}>
      <div className="dashboard__seccion-encabezado">
        <h2>Ocupación e ingresos</h2>
        <div className="dashboard__filtros">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
            {Object.entries(PERIODOS).map(([id, p]) => (
              <option key={id} value={id}>
                {p.etiqueta}
              </option>
            ))}
          </select>
          <button type="button" className="tabla__accion icono-en-linea" onClick={recargar}>
            <RefreshCw size={14} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </div>

      {error ? (
        <ErrorCarga error={error} onReintentar={recargar} />
      ) : !datos ? (
        <p className="tabla__vacio">Cargando indicadores…</p>
      ) : (
        <>
          <p className="dashboard__periodo">
            Del {formatoDia.format(new Date(`${desde}T00:00:00Z`))} al {formatoDia.format(new Date(`${sumarDias(hasta, -1)}T00:00:00Z`))}{' '}
            {desde.slice(0, 4) !== sumarDias(hasta, -1).slice(0, 4) ? `(${desde.slice(0, 4)}–${sumarDias(hasta, -1).slice(0, 4)})` : `de ${desde.slice(0, 4)}`}
          </p>
          <div className="dashboard__stats dashboard__stats--seis">
            <Indicador icono={Percent} etiqueta="Ocupación" valor={porcentaje.format(r.ocupacion)} nota={`${r.nochesVendidas} de ${r.nochesDisponibles} noches`} />
            <Indicador icono={CircleDollarSign} etiqueta="Ingresos" valor={cop.format(r.ingresos)} nota={r.cargosCancelacion ? `Incluye ${cop.format(r.cargosCancelacion)} de cargos por cancelación` : 'Repartidos por noche de estadía'} />
            <Indicador icono={Tag} etiqueta="Tarifa promedio por noche" valor={cop.format(r.tarifaPromedio)} nota="Sin impuestos ni limpieza" />
            <Indicador icono={BedDouble} etiqueta="RevPAR" valor={cop.format(r.revpar)} nota="Ingreso por habitación disponible" />
            <Indicador icono={ChartColumn} etiqueta="Reservas creadas" valor={r.reservasCreadas} />
            <Indicador
              icono={CalendarX2}
              etiqueta="Cancelaciones"
              valor={r.cancelaciones}
              nota={r.reservasCreadas ? `${porcentaje.format(r.tasaCancelacion)} de las creadas` : undefined}
            />
          </div>

          <div className="dashboard__graficas">
            <div className="tarjeta-seccion">
              <GraficaBarras
                titulo={`Ingresos por ${porMes ? 'mes' : 'día'}`}
                formato={(v) => copCompacto.format(v)}
                columnasTabla={[porMes ? 'Mes' : 'Día', 'Ingresos', 'Noches vendidas']}
                datos={datos.serie.map((p) => ({
                  clave: p.periodo,
                  etiqueta: etiquetar(p.periodo),
                  etiquetaCorta: etiquetarCorto(p.periodo),
                  valor: p.ingresos,
                  detalle: [`Noches vendidas: ${p.nochesVendidas}`],
                }))}
              />
            </div>
            <div className="tarjeta-seccion">
              <GraficaBarras
                titulo={`Ocupación por ${porMes ? 'mes' : 'día'}`}
                formato={(v) => porcentaje.format(v)}
                columnasTabla={[porMes ? 'Mes' : 'Día', 'Ocupación', 'Noches vendidas']}
                datos={datos.serie.map((p) => ({
                  clave: p.periodo,
                  etiqueta: etiquetar(p.periodo),
                  etiquetaCorta: etiquetarCorto(p.periodo),
                  valor: p.ocupacion,
                  detalle: [`Noches vendidas: ${p.nochesVendidas}`],
                }))}
              />
            </div>
          </div>

          <div className="tarjeta-seccion">
            <h2>Por hotel</h2>
            <div className="tabla-envoltorio">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Hotel</th>
                    <th>Habitaciones</th>
                    <th>Noches vendidas</th>
                    <th>Ocupación</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porHotel.map((h) => (
                    <tr key={h.hotelId}>
                      <td>{h.nombre}</td>
                      <td>{h.habitaciones}</td>
                      <td>{h.nochesVendidas}</td>
                      <td>
                        <span className="medidor" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, h.ocupacion * 100)}%` }} />
                        </span>
                        {porcentaje.format(h.ocupacion)}
                      </td>
                      <td>{cop.format(h.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
