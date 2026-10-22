import { enTransaccion } from '../../db/conexion.js'
import { errores } from '../../utils/errores.js'
import { generarSlug } from '../../utils/identificadores.js'
import { cotizarParaHotel, politicaCancelacion } from '../tarifas/tarifas.servicio.js'
import { temporadasRepositorio } from '../tarifas/temporadas.repositorio.js'
import { hotelesRepositorio as repo } from './hoteles.repositorio.js'

export const IMAGEN_RESPALDO =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=450&q=70'

const REPUTACION_INICIAL = { promedio: 0, total: 0, limpieza: 0, ubicacion: 0, cobertura: 0, respuesta: 0 }

// Minúsculas y sin tildes: "Japón" y "japon" se consideran iguales.
const normalizar = (texto = '') => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function exigirHotel(id) {
  const hotel = repo.buscarPorId(id)
  if (!hotel) throw errores.noEncontrado('No encontramos ese hotel.')
  return hotel
}

function exigirDestino(destinoId) {
  if (!repo.existeDestino(destinoId)) throw errores.reglaNegocio(`El destino "${destinoId}" no existe.`)
}

function exigirColecciones(ids = []) {
  const faltan = repo.coleccionesInexistentes(ids)
  if (faltan.length) throw errores.reglaNegocio(`Estas colecciones no existen: ${faltan.join(', ')}.`)
}

function exigirHabitacion(hotelId, habitacionId) {
  const habitacion = repo.buscarHabitacion(hotelId, habitacionId)
  if (!habitacion) throw errores.noEncontrado('No encontramos esa habitación en este hotel.')
  return habitacion
}

/** Textos en los que se busca: los del hotel y los de su destino, en español y en inglés. */
function textosBuscables(hotel) {
  const en = hotel.traducciones.en ?? {}
  const destinoEn = hotel.destino.traducciones.en ?? {}
  return [hotel.nombre, hotel.ubicacion, hotel.destinoId, hotel.destino.nombre, hotel.destino.pais, en.ubicacion, destinoEn.nombre, destinoEn.pais]
}

export const hotelesServicio = {
  listar({ destino, huespedes, coleccion }) {
    const hoteles = repo.listar({ capacidadMinima: huespedes, coleccionId: coleccion })
    const q = normalizar(destino)
    if (!q) return hoteles
    // "Cartagena de Indias" encuentra los hoteles del destino aunque su ubicación diga solo "Cartagena".
    return hoteles.filter((h) => textosBuscables(h).some((campo) => campo && normalizar(campo).includes(q)))
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

  /** Noches ocupadas de cada habitación y temporadas del periodo: lo que necesita el calendario. */
  calendario(id, { desde, hasta }) {
    const hotel = exigirHotel(id)
    const ocupacion = repo.ocupacion(id, desde, hasta)
    return {
      desde,
      hasta,
      habitaciones: hotel.habitaciones.map((h) => ({
        id: h.id,
        ocupadas: ocupacion.filter((o) => o.habitacionId === h.id).map(({ entrada, salida }) => ({ entrada, salida })),
      })),
      temporadas: temporadasRepositorio
        .aplicables(id, desde, hasta)
        .map(({ nombre, inicio, fin, recargo }) => ({ nombre, inicio, fin, recargo })),
    }
  },

  /** Precio exacto (noche por noche) y disponibilidad, antes de reservar. */
  cotizacion(id, { habitacionId, entrada, salida, huespedes }) {
    const habitacion = exigirHabitacion(id, habitacionId)
    const ocupada = repo.habitacionesOcupadas(id, entrada, salida).includes(habitacionId)
    const cotizacion = cotizarParaHotel(id, habitacion.precio, entrada, salida)
    return {
      ...cotizacion,
      habitacionId,
      entrada,
      salida,
      disponible: !ocupada && habitacion.capacidad >= huespedes,
      motivo: ocupada ? 'ocupada' : habitacion.capacidad < huespedes ? 'capacidad-insuficiente' : null,
      cancelacion: politicaCancelacion({ entrada, ...cotizacion }),
    }
  },

  crear(datos) {
    exigirDestino(datos.destinoId)
    exigirColecciones(datos.colecciones)
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
        traducciones: datos.traducciones,
      })
      repo.reemplazarImagenes(id, [imagen])
      repo.reemplazarColecciones(id, datos.colecciones)
      // Todo hotel nace con al menos una habitación reservable.
      repo.insertarHabitacion(id, {
        id: 'habitacion-estandar',
        nombre: 'Habitación Estándar',
        detalle: 'Habitación base creada por el administrador',
        precio: datos.precioNoche,
        capacidad: 2,
        imagen,
        destacado: false,
        traducciones: { en: { nombre: 'Standard Room', detalle: 'Base room created by the administrator' } },
      })
    })
    return repo.buscarPorId(id)
  },

  actualizar(id, cambios) {
    exigirHotel(id)
    if (cambios.destinoId) exigirDestino(cambios.destinoId)
    if (cambios.colecciones) exigirColecciones(cambios.colecciones)
    enTransaccion(() => {
      repo.actualizar(id, cambios)
      if (cambios.imagenes) repo.reemplazarImagenes(id, cambios.imagenes)
      if (cambios.colecciones) repo.reemplazarColecciones(id, cambios.colecciones)
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
