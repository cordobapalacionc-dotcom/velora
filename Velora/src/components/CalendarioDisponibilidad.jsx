import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { calcularNoches, hoyLocal, nochesDeEstadia, sumarDias } from '../utils/fechas.js'
import { MAX_NOCHES, temporadaDeLaNoche } from '../utils/tarifas.js'

const primerDiaDelMes = (fecha) => `${fecha.slice(0, 7)}-01`
const sumarMeses = (mes, n) => {
  const d = new Date(`${mes}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

/** Días del mes con huecos al inicio para que la semana empiece en lunes. */
function diasDelMes(primerDia) {
  const desplazamiento = (new Date(`${primerDia}T00:00:00Z`).getUTCDay() + 6) % 7
  const dias = []
  for (let d = primerDia; d.slice(0, 7) === primerDia.slice(0, 7); d = sumarDias(d, 1)) dias.push(d)
  return [...Array(desplazamiento).fill(null), ...dias]
}

/**
 * Calendario de dos meses para elegir llegada y salida de una habitación.
 * - Las noches ocupadas se tachan. Se puede salir el día en que entra otra reserva (esa noche no se usa).
 * - Las noches con temporada llevan una marca (recargo o descuento).
 * - Teclado: flechas para moverse por días/semanas, Re Pág/Av Pág para cambiar de mes, Enter para elegir.
 */
export default function CalendarioDisponibilidad({ ocupadas = [], temporadas = [], entrada, salida, onCambio, maximo }) {
  const { t, locale } = useIdioma()
  const hoy = hoyLocal()
  const ultimoDia = maximo ?? sumarDias(hoy, 365)
  const [mesVisible, setMesVisible] = useState(primerDiaDelMes(entrada || hoy))
  const [foco, setFoco] = useState(entrada || hoy)
  const [focoConTeclado, setFocoConTeclado] = useState(false)
  const botones = useRef(new Map())

  // Si la llegada cambia desde fuera (los campos de fecha del panel) y no está a la vista, el calendario
  // viaja hasta ese mes. Se ajusta durante el render, como recomienda React para estado derivado de props.
  const [entradaVista, setEntradaVista] = useState(entrada)
  if (entrada !== entradaVista) {
    setEntradaVista(entrada)
    if (entrada && primerDiaDelMes(entrada) !== mesVisible && primerDiaDelMes(entrada) !== sumarMeses(mesVisible, 1)) {
      setMesVisible(primerDiaDelMes(entrada))
      setFoco(entrada)
    }
  }

  const nochesOcupadas = useMemo(() => new Set(ocupadas.flatMap((o) => nochesDeEstadia(o.entrada, o.salida))), [ocupadas])
  const eligiendoSalida = Boolean(entrada && !salida)

  // ¿Están libres todas las noches entre `desde` y `hasta` (sin incluir `hasta`)?
  const rangoLibre = (desde, hasta) => nochesDeEstadia(desde, hasta).every((n) => !nochesOcupadas.has(n))

  function puedeSerSalida(dia) {
    return eligiendoSalida && dia > entrada && calcularNoches(entrada, dia) <= MAX_NOCHES && rangoLibre(entrada, dia)
  }
  const puedeSerEntrada = (dia) => dia >= hoy && dia < ultimoDia && !nochesOcupadas.has(dia)
  const seleccionable = (dia) => puedeSerSalida(dia) || puedeSerEntrada(dia)

  function elegir(dia) {
    if (puedeSerSalida(dia)) onCambio({ entrada, salida: dia })
    else if (puedeSerEntrada(dia)) onCambio({ entrada: dia, salida: '' })
  }

  // Al moverse con el teclado, el foco sigue al día activo (aunque cambie de mes).
  useEffect(() => {
    if (focoConTeclado) botones.current.get(foco)?.focus()
  }, [foco, focoConTeclado])

  function mover(dias, meses = 0) {
    const destino = meses ? sumarMeses(foco, meses) : sumarDias(foco, dias)
    if (destino < primerDiaDelMes(hoy) || destino > ultimoDia) return
    setFoco(destino)
    setFocoConTeclado(true)
    const mesDestino = primerDiaDelMes(destino)
    if (mesDestino < mesVisible) setMesVisible(mesDestino)
    else if (mesDestino > sumarMeses(mesVisible, 1)) setMesVisible(sumarMeses(mesDestino, -1))
  }

  function alPresionarTecla(evento) {
    const acciones = { ArrowLeft: [-1], ArrowRight: [1], ArrowUp: [-7], ArrowDown: [7], PageUp: [0, -1], PageDown: [0, 1] }
    const accion = acciones[evento.key]
    if (!accion) return
    evento.preventDefault()
    mover(...accion)
  }

  const nombreMes = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const diaLargo = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const diasSemana = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i)))
  )
  const mesesVisibles = [mesVisible, sumarMeses(mesVisible, 1)]
  // El día que recibe el Tab: el activo si está a la vista; si no, el primero del mes visible.
  const diaTabulable = mesesVisibles.includes(primerDiaDelMes(foco)) ? foco : mesVisible
  const puedeRetroceder = mesVisible > primerDiaDelMes(hoy)
  const puedeAvanzar = sumarMeses(mesVisible, 2) <= ultimoDia

  function describir(dia) {
    const partes = [diaLargo.format(new Date(`${dia}T00:00:00Z`))]
    if (dia === entrada) partes.push(t('calendario.llegada'))
    if (dia === salida) partes.push(t('calendario.salida'))
    if (nochesOcupadas.has(dia)) partes.push(t('calendario.ocupada'))
    const temporada = temporadaDeLaNoche(dia, temporadas)
    if (temporada) partes.push(`${temporada.nombre} (${temporada.recargo > 0 ? '+' : ''}${temporada.recargo} %)`)
    return partes.join(', ')
  }

  return (
    <div className="calendario">
      <div className="calendario__navegacion">
        <button type="button" onClick={() => setMesVisible(sumarMeses(mesVisible, -1))} disabled={!puedeRetroceder} aria-label={t('calendario.mesAnterior')}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="calendario__instruccion" aria-live="polite">
          {eligiendoSalida ? t('calendario.eligeSalida') : t('calendario.eligeLlegada')}
        </p>
        <button type="button" onClick={() => setMesVisible(sumarMeses(mesVisible, 1))} disabled={!puedeAvanzar} aria-label={t('calendario.mesSiguiente')}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calendario__meses" onKeyDown={alPresionarTecla}>
        {mesesVisibles.map((mes) => (
          <div key={mes} className="calendario__mes">
            <p className="calendario__titulo-mes">{nombreMes.format(new Date(`${mes}T00:00:00Z`))}</p>
            <div className="calendario__semana" aria-hidden="true">
              {diasSemana.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="calendario__dias">
              {diasDelMes(mes).map((dia, i) => {
                if (!dia) return <span key={`hueco-${i}`} />
                const temporada = temporadaDeLaNoche(dia, temporadas)
                const enRango = entrada && salida && dia > entrada && dia < salida
                // aria-disabled (no disabled): los días no elegibles siguen siendo navegables con el teclado
                const clases = [
                  'calendario__dia',
                  nochesOcupadas.has(dia) && 'calendario__dia--ocupado',
                  dia === hoy && 'calendario__dia--hoy',
                  (dia === entrada || dia === salida) && 'calendario__dia--extremo',
                  enRango && 'calendario__dia--rango',
                  temporada && (temporada.recargo > 0 ? 'calendario__dia--alta' : 'calendario__dia--baja'),
                ]
                return (
                  <button
                    key={dia}
                    ref={(el) => (el ? botones.current.set(dia, el) : botones.current.delete(dia))}
                    type="button"
                    className={clases.filter(Boolean).join(' ')}
                    aria-disabled={!seleccionable(dia)}
                    aria-pressed={dia === entrada || dia === salida}
                    aria-label={describir(dia)}
                    tabIndex={dia === diaTabulable ? 0 : -1}
                    onClick={() => {
                      setFoco(dia)
                      setFocoConTeclado(false)
                      if (seleccionable(dia)) elegir(dia)
                    }}
                  >
                    {Number(dia.slice(8))}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <ul className="calendario__leyenda">
        <li>
          <span className="calendario__muestra calendario__muestra--seleccion" aria-hidden="true" />
          {t('calendario.leyendaSeleccion')}
        </li>
        <li>
          <span className="calendario__muestra calendario__muestra--ocupado" aria-hidden="true" />
          {t('calendario.leyendaOcupado')}
        </li>
        {temporadas.some((x) => x.recargo > 0) && (
          <li>
            <span className="calendario__muestra calendario__muestra--alta" aria-hidden="true" />
            {t('calendario.leyendaAlta')}
          </li>
        )}
        {temporadas.some((x) => x.recargo < 0) && (
          <li>
            <span className="calendario__muestra calendario__muestra--baja" aria-hidden="true" />
            {t('calendario.leyendaBaja')}
          </li>
        )}
      </ul>
    </div>
  )
}
