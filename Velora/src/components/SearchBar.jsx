import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdioma } from '../context/IdiomaContext.jsx'
import { hoyLocal, sumarDias } from '../utils/fechas.js'

export const OPCIONES_HUESPEDES = [1, 2, 3, 4, 5, 6]

export default function SearchBar({ valoresIniciales, variante = 'hero' }) {
  const navegar = useNavigate()
  const { t } = useIdioma()
  const [destino, setDestino] = useState(valoresIniciales?.destino ?? '')
  const [entrada, setEntrada] = useState(valoresIniciales?.entrada ?? '')
  const [salida, setSalida] = useState(valoresIniciales?.salida ?? '')
  const [huespedes, setHuespedes] = useState(valoresIniciales?.huespedes ?? '2')

  function manejarBusqueda(evento) {
    evento.preventDefault()
    const params = new URLSearchParams()
    if (destino) params.set('destino', destino)
    if (entrada) params.set('entrada', entrada)
    if (salida && (!entrada || salida > entrada)) params.set('salida', salida)
    if (huespedes) params.set('huespedes', huespedes)
    navegar(`/buscar?${params.toString()}`)
  }

  return (
    <form className={`search-bar search-bar--${variante}`} onSubmit={manejarBusqueda} role="search">
      <label className="search-bar__campo">
        <span>{t('buscar.destino')}</span>
        <input
          type="text"
          placeholder={t('buscar.destinoPista')}
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        />
      </label>
      <label className="search-bar__campo">
        <span>{t('buscar.llegada')}</span>
        <input type="date" value={entrada} min={hoyLocal()} onChange={(e) => setEntrada(e.target.value)} />
      </label>
      <label className="search-bar__campo">
        <span>{t('buscar.salida')}</span>
        <input
          type="date"
          value={salida}
          min={entrada ? sumarDias(entrada, 1) : hoyLocal()}
          onChange={(e) => setSalida(e.target.value)}
        />
      </label>
      <label className="search-bar__campo">
        <span>{t('buscar.huespedes')}</span>
        <select value={huespedes} onChange={(e) => setHuespedes(e.target.value)}>
          {OPCIONES_HUESPEDES.map((n) => (
            <option key={n} value={n}>
              {t(n === 1 ? 'comun.huesped' : 'comun.huespedes', { n })}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn--dorado search-bar__boton">
        {t('buscar.boton')}
      </button>
    </form>
  )
}
