import { enTransaccion } from '../../db/conexion.js'
import { errores } from '../../utils/errores.js'
import { generarSlug } from '../../utils/identificadores.js'
import { hotelesRepositorio as repo } from './hoteles.repositorio.js'

export const IMAGEN_RESPALDO =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=450&q=70'

const REPUTACION_INICIAL = { promedio: 0, total: 0, limpieza: 0, ubicacion: 0, cobertura: 0, respuesta: 0 }

function exigirHotel(id) {
  const hotel = repo.buscarPorId(id)
  if (!hotel) throw errores.noEncontrado('No encontramos ese hotel.')
  return hotel
}

function exigirDestino(destinoId) {
  if (!repo.existeDestino(destinoId)) throw errores.reglaNegocio(`El destino "${destinoId}" no existe.`)
}

function exigirHabitacion(hotelId, habitacionId) {
  const habitacion = repo.buscarHabitacion(hotelId, habitacionId)
  if (!habitacion) throw errores.noEncontrado('No encontramos esa habitación en este hotel.')
  return habitacion
}

export const hotelesServicio = {
  listar({ destino, huespedes }) {
    return repo.listar({ texto: destino, capacidadMinima: huespedes })
  },

  obtener: exigirHotel,

  similares(id, cantidad) {
    exigirHotel(id)
    return repo.similares(id, cantidad)
  },

  disponibilidad(id, { entrada, salida, huespedes }) {
    const hotel = exigirHotel(id)
    const ocupadas = new Set(repo.habitacionesOcupadas(id, entrada, salida))
    return hotel.habitaciones.map((h) => ({
      ...h,
      disponible: !ocupadas.has(h.id) && h.capacidad >= huespedes,
      motivo: ocupadas.has(h.id) ? 'ocupada' : h.capacidad < huespedes ? 'capacidad-insuficiente' : null,
    }))
  },

  crear(datos) {
    exigirDestino(datos.destinoId)
    const imagen = datos.imagen ?? IMAGEN_RESPALDO
    const id = generarSlug(datos.nombre, 'hotel')

    enTransaccion(() => {
      repo.insertar({
        id,
        nombre: datos.nombre,
        destinoId: datos.destinoId,
        ubicacion: datos.ubicacion,
        precioNoche: datos.precioNoche,
        descripcionCorta: datos.descripcionCorta,
        descripcion: datos.descripcion,
        reputacion: REPUTACION_INICIAL,
      })
      repo.reemplazarImagenes(id, [imagen])
      // Todo hotel nace con al menos una habitación reservable.
      repo.insertarHabitacion(id, {
        id: 'habitacion-estandar',
        nombre: 'Habitación Estándar',
        detalle: 'Habitación base creada por el administrador',
        precio: datos.precioNoche,
        capacidad: 2,
        imagen,
        destacado: false,
      })
    })
    return repo.buscarPorId(id)
  },

  actualizar(id, cambios) {
    exigirHotel(id)
    if (cambios.destinoId) exigirDestino(cambios.destinoId)
    enTransaccion(() => {
      repo.actualizar(id, cambios)
      if (cambios.imagenes) repo.reemplazarImagenes(id, cambios.imagenes)
    })
    return repo.buscarPorId(id)
  },

  eliminar(id) {
    exigirHotel(id)
    const reservas = repo.contarReservas(id)
    if (reservas > 0) {
      throw errores.conflicto(`No se puede eliminar: el hotel tiene ${reservas} reserva(s) registradas.`)
    }
    repo.eliminar(id)
  },

  // ---- Habitaciones ----

  crearHabitacion(hotelId, datos) {
    exigirHotel(hotelId)
    const id = generarSlug(datos.nombre, 'habitacion')
    repo.insertarHabitacion(hotelId, { ...datos, id, imagen: datos.imagen ?? IMAGEN_RESPALDO })
    return repo.buscarHabitacion(hotelId, id)
  },

  actualizarHabitacion(hotelId, habitacionId, cambios) {
    exigirHabitacion(hotelId, habitacionId)
    repo.actualizarHabitacion(hotelId, habitacionId, cambios)
    return repo.buscarHabitacion(hotelId, habitacionId)
  },

  eliminarHabitacion(hotelId, habitacionId) {
    exigirHabitacion(hotelId, habitacionId)
    if (repo.contarHabitaciones(hotelId) <= 1) {
      throw errores.reglaNegocio('Un hotel debe conservar al menos una habitación.')
    }
    const reservas = repo.contarReservas(hotelId, habitacionId)
    if (reservas > 0) {
      throw errores.conflicto(`No se puede eliminar: la habitación tiene ${reservas} reserva(s) registradas.`)
    }
    repo.eliminarHabitacion(hotelId, habitacionId)
  },
}
