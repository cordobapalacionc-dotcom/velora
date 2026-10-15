import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar({ valoresIniciales, variante = 'hero' }) {
  const navegar = useNavigate()
  const [destino, setDestino] = useState(valoresIniciales?.destino ?? '')
  const [entrada, setEntrada] = useState(valoresIniciales?.entrada ?? '')
  const [salida, setSalida] = useState(valoresIniciales?.salida ?? '')
  const [huespedes, setHuespedes] = useState(valoresIniciales?.huespedes ?? '2')

  function manejarBusqueda(evento) {
    evento.preventDefault()
    const params = new URLSearchParams()
    if (destino) params.set('destino', destino)
    if (entrada) params.set('entrada', entrada)
    if (salida) params.set('salida', salida)
    if (huespedes) params.set('huespedes', huespedes)
    navegar(`/buscar?${params.toString()}`)
  }

  return (
    <form className={`search-bar search-bar--${variante}`} onSubmit={manejarBusqueda}>
      <label className="search-bar__campo">
        <span>Destino</span>
        <input
          type="text"
          placeholder="¿A dónde quieres ir?"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        />
      </label>
      <label className="search-bar__campo">
        <span>Llegada</span>
        <input type="date" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
      </label>
      <label className="search-bar__campo">
        <span>Salida</span>
        <input type="date" value={salida} onChange={(e) => setSalida(e.target.value)} />
      </label>
      <label className="search-bar__campo">
        <span>Huéspedes</span>
        <select value={huespedes} onChange={(e) => setHuespedes(e.target.value)}>
          <option value="1">1 huésped</option>
          <option value="2">2 huéspedes</option>
          <option value="3">3 huéspedes</option>
          <option value="4">4 huéspedes</option>
          <option value="5">5 huéspedes</option>
          <option value="6">6 huéspedes</option>
        </select>
      </label>
      <button type="submit" className="btn btn--dorado search-bar__boton">
        Buscar
      </button>
    </form>
  )
}
