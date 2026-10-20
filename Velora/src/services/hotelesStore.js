import { hoteles as hotelesSemilla } from '../pages/data/hotels.js'

const CLAVE_HOTELES = 'velora_hoteles'
export const IMAGEN_RESPALDO =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=450&q=70'
const CLAVE_VERSION = 'velora_hoteles_version'
// Sube este número cada vez que se agreguen habitaciones o campos nuevos a la semilla,
// para que los hoteles ya guardados en el navegador se actualicen una sola vez sin
// perder los cambios que haya hecho el administrador.
// v3: fotos coherentes con cada destino y colecciones por hotel.
const VERSION_SEMILLA = 3

// Fotos de habitación que traía la semilla hasta la v2. Solo esas se reemplazan al actualizar:
// si el admin ya puso su propia foto, se respeta.
const FOTOS_HABITACION_ANTIGUAS = [
  'photo-1566073771259', 'photo-1611892440504', 'photo-1571003123894', 'photo-1571896349842',
  'photo-1570077188670', 'photo-1493976040374', 'photo-1476514525535', 'photo-1583531352515',
  'photo-1447933601403',
]
const esFotoAntigua = (url = '') => FOTOS_HABITACION_ANTIGUAS.some((id) => url.includes(id))

function fusionarConSemilla(guardados) {
  return guardados.map((hotelGuardado) => {
    const hotelSemilla = hotelesSemilla.find((h) => h.id === hotelGuardado.id)
    if (!hotelSemilla) return { colecciones: [], ...hotelGuardado }

    const idsExistentes = new Set(hotelGuardado.habitaciones.map((h) => h.id))
    const habitacionesFaltantes = hotelSemilla.habitaciones.filter((h) => !idsExistentes.has(h.id))

    return {
      ...hotelGuardado,
      // La galería y las colecciones de un hotel no se pueden editar desde el panel,
      // así que se toman de la semilla sin riesgo de perder cambios del admin.
      imagenes: hotelSemilla.imagenes,
      colecciones: hotelSemilla.colecciones,
      habitaciones: [
        ...hotelGuardado.habitaciones.map((h) => {
          const semilla = hotelSemilla.habitaciones.find((s) => s.id === h.id)
          const imagen = semilla && esFotoAntigua(h.imagen) ? semilla.imagen : h.imagen
          return { capacidad: 2, ...h, imagen }
        }),
        ...habitacionesFaltantes,
      ],
    }
  })
}

function leerHoteles() {
  let guardados = null
  try {
    const parseado = JSON.parse(localStorage.getItem(CLAVE_HOTELES))
    if (Array.isArray(parseado)) guardados = parseado
  } catch {
    guardados = null
  }

  if (!guardados) {
    guardarHoteles(hotelesSemilla)
    localStorage.setItem(CLAVE_VERSION, String(VERSION_SEMILLA))
    return hotelesSemilla
  }

  const versionGuardada = Number(localStorage.getItem(CLAVE_VERSION)) || 0
  if (versionGuardada < VERSION_SEMILLA) {
    guardados = fusionarConSemilla(guardados)
    guardarHoteles(guardados)
    localStorage.setItem(CLAVE_VERSION, String(VERSION_SEMILLA))
  }

  return guardados
}

function guardarHoteles(lista) {
  localStorage.setItem(CLAVE_HOTELES, JSON.stringify(lista))
}

function generarId(nombre, prefijo = 'hotel') {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
  const sufijo = Math.random().toString(36).slice(2, 6)
  return `${base || prefijo}-${sufijo}`
}

export function obtenerHoteles() {
  return leerHoteles()
}

export function buscarHoteles(destino) {
  const hoteles = leerHoteles()
  const q = destino?.trim().toLowerCase()
  if (!q) return hoteles
  return hoteles.filter(
    (h) =>
      h.ubicacion.toLowerCase().includes(q) ||
      h.nombre.toLowerCase().includes(q) ||
      h.destinoId.toLowerCase().includes(q)
  )
}

export function obtenerHotelPorId(id) {
  return leerHoteles().find((h) => h.id === id)
}

export function hotelesSimilares(id, cantidad = 3) {
  const hoteles = leerHoteles()
  const actual = hoteles.find((h) => h.id === id)
  const resto = hoteles.filter((h) => h.id !== id)
  if (!actual) return resto.slice(0, cantidad)

  const mismoDestino = resto.filter((h) => h.destinoId === actual.destinoId)
  const otros = resto.filter((h) => h.destinoId !== actual.destinoId)
  return [...mismoDestino, ...otros].slice(0, cantidad)
}

export function crearHotel(datos) {
  const hoteles = leerHoteles()
  const precio = Number(datos.precioNoche) || 0
  const nuevoHotel = {
    id: generarId(datos.nombre),
    nombre: datos.nombre.trim(),
    destinoId: datos.destinoId,
    colecciones: [],
    ubicacion: datos.ubicacion.trim(),
    calificacion: 0,
    numResenas: 0,
    precioNoche: precio,
    descripcionCorta: datos.descripcionCorta?.trim() || '',
    descripcion: datos.descripcion?.trim() || '',
    imagenes: [datos.imagen?.trim() || IMAGEN_RESPALDO],
    habitaciones: [
      {
        id: 'habitacion-estandar',
        nombre: 'Habitación Estándar',
        detalle: 'Habitación base creada por el administrador',
        precio,
        capacidad: 2,
        imagen: datos.imagen?.trim() || IMAGEN_RESPALDO,
      },
    ],
    reputacion: { promedio: 0, total: 0, limpieza: 0, ubicacion: 0, cobertura: 0, respuesta: 0 },
  }
  guardarHoteles([...hoteles, nuevoHotel])
  return nuevoHotel
}

export function eliminarHotel(id) {
  guardarHoteles(leerHoteles().filter((h) => h.id !== id))
}

export function agregarHabitacion(hotelId, datos) {
  const hoteles = leerHoteles()
  const nuevaHabitacion = {
    id: generarId(datos.nombre, 'habitacion'),
    nombre: datos.nombre.trim(),
    detalle: datos.detalle?.trim() || '',
    precio: Number(datos.precio) || 0,
    capacidad: Number(datos.capacidad) || 2,
    imagen: datos.imagen?.trim() || IMAGEN_RESPALDO,
    destacado: Boolean(datos.destacado),
  }
  guardarHoteles(
    hoteles.map((h) =>
      h.id === hotelId ? { ...h, habitaciones: [...h.habitaciones, nuevaHabitacion] } : h
    )
  )
  return nuevaHabitacion
}

export function actualizarHabitacion(hotelId, habitacionId, datos) {
  const hoteles = leerHoteles()
  guardarHoteles(
    hoteles.map((h) => {
      if (h.id !== hotelId) return h
      return {
        ...h,
        habitaciones: h.habitaciones.map((hab) =>
          hab.id === habitacionId
            ? {
                ...hab,
                nombre: datos.nombre?.trim() || hab.nombre,
                detalle: datos.detalle?.trim() ?? hab.detalle,
                precio: Number(datos.precio) || hab.precio,
                capacidad: Number(datos.capacidad) || hab.capacidad,
                imagen: datos.imagen?.trim() || hab.imagen,
                destacado: Boolean(datos.destacado),
              }
            : hab
        ),
      }
    })
  )
}

export function eliminarHabitacion(hotelId, habitacionId) {
  const hoteles = leerHoteles()
  guardarHoteles(
    hoteles.map((h) =>
      h.id === hotelId
        ? { ...h, habitaciones: h.habitaciones.filter((hab) => hab.id !== habitacionId) }
        : h
    )
  )
}
