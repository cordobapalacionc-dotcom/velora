const CLAVE_RESERVAS = 'velora_reservas'

function leerReservas() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_RESERVAS))
    return Array.isArray(guardadas) ? guardadas : []
  } catch {
    return []
  }
}

function guardarReservas(lista) {
  localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(lista))
}

function generarCodigo() {
  return `VEL-${Math.floor(10000 + Math.random() * 90000)}`
}

export function obtenerReservas() {
  return leerReservas()
}

export function obtenerReservasPorHotel(hotelId) {
  return leerReservas().filter((r) => r.hotelId === hotelId)
}

export function buscarReservas(consulta) {
  const reservas = leerReservas()
  const q = consulta?.trim().toLowerCase()
  if (!q) return reservas
  return reservas.filter(
    (r) =>
      r.huespedNombre.toLowerCase().includes(q) ||
      r.huespedCorreo.toLowerCase().includes(q) ||
      r.codigo.toLowerCase().includes(q)
  )
}

export function crearReserva(datos) {
  const reservas = leerReservas()
  const nuevaReserva = {
    id: crypto.randomUUID(),
    codigo: generarCodigo(),
    ...datos,
    estado: 'confirmada',
    fechaCreacion: new Date().toISOString(),
    fechaCheckIn: null,
    fechaCheckOut: null,
  }
  guardarReservas([...reservas, nuevaReserva])
  return nuevaReserva
}

export function marcarCheckIn(id) {
  guardarReservas(
    leerReservas().map((r) =>
      r.id === id ? { ...r, estado: 'check-in', fechaCheckIn: new Date().toISOString() } : r
    )
  )
}

export function marcarCheckOut(id) {
  guardarReservas(
    leerReservas().map((r) =>
      r.id === id ? { ...r, estado: 'check-out', fechaCheckOut: new Date().toISOString() } : r
    )
  )
}

export function cancelarReserva(id) {
  guardarReservas(leerReservas().map((r) => (r.id === id ? { ...r, estado: 'cancelada' } : r)))
}
