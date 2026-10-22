// Cliente de la API del backend (carpeta /backend). Cambia la URL con VITE_API_URL en un archivo .env.
// Todos los datos del sitio (hoteles, reservas, usuarios) viven en el backend: nada se guarda en el navegador
// salvo la sesión y las preferencias de idioma y moneda.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

/** Error de la API con su código HTTP y el código de negocio del backend (p. ej. CUENTA_BLOQUEADA). */
export class ErrorApi extends Error {
  constructor(mensaje, { estado = 0, codigo = 'RED', detalles } = {}) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
    this.detalles = detalles
  }
}

// La sesión la maneja AuthContext; aquí solo se guarda el token para adjuntarlo a cada petición.
let tokenActual = null
let alExpirar = () => {}

export function establecerToken(token) {
  tokenActual = token ?? null
}

/** Qué hacer cuando el backend rechaza el token (expiró o se cambió la contraseña en otro equipo). */
export function alExpirarSesion(funcion) {
  alExpirar = funcion
}

function construirUrl(ruta, query) {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor)
  }
  const texto = params.toString()
  return `${API_URL}${ruta}${texto ? `?${texto}` : ''}`
}

async function pedir(ruta, { metodo = 'GET', body, query, formulario, comoArchivo = false } = {}) {
  const headers = {}
  if (tokenActual) headers.Authorization = `Bearer ${tokenActual}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let respuesta
  try {
    respuesta = await fetch(construirUrl(ruta, query), {
      method: metodo,
      headers,
      body: formulario ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa que el backend esté encendido (npm run dev en la carpeta backend).')
  }

  if (respuesta.status === 401 && tokenActual) alExpirar()

  if (!respuesta.ok) {
    const json = await respuesta.json().catch(() => null)
    throw new ErrorApi(json?.error?.mensaje ?? `El servidor respondió con un error (${respuesta.status}).`, {
      estado: respuesta.status,
      codigo: json?.error?.codigo ?? 'ERROR',
      detalles: json?.error?.detalles,
    })
  }
  if (comoArchivo) return respuesta.blob()
  if (respuesta.status === 204) return null
  return respuesta.json()
}

const datos = async (promesa) => (await promesa).datos
const enviar = (metodo) => (ruta, body) => pedir(ruta, { metodo, body })
const post = enviar('POST')
const patch = enviar('PATCH')
const borrar = (ruta) => pedir(ruta, { metodo: 'DELETE' })

export const api = {
  auth: {
    login: (correo, contrasena) => post('/auth/login', { correo, contrasena }),
    registro: (nombre, correo, contrasena) => post('/auth/registro', { nombre, correo, contrasena }),
    recuperar: (correo) => post('/auth/recuperar', { correo }),
    restablecer: (token, contrasena) => post('/auth/restablecer', { token, contrasena }),
    yo: () => pedir('/auth/yo'),
  },

  catalogo: {
    destinos: () => datos(pedir('/catalogo/destinos')),
    colecciones: () => datos(pedir('/catalogo/colecciones')),
    configuracion: () => datos(pedir('/catalogo/configuracion')),
  },

  hoteles: {
    listar: (filtros) => datos(pedir('/hoteles', { query: filtros })),
    obtener: (id) => datos(pedir(`/hoteles/${id}`)),
    similares: (id, cantidad = 3) => datos(pedir(`/hoteles/${id}/similares`, { query: { cantidad } })),
    calendario: (id, desde, hasta) => datos(pedir(`/hoteles/${id}/calendario`, { query: { desde, hasta } })),
    cotizacion: (id, consulta) => datos(pedir(`/hoteles/${id}/cotizacion`, { query: consulta })),
    resenas: (id, limite = 10) => datos(pedir(`/hoteles/${id}/resenas`, { query: { limite } })),
    crear: (hotel) => datos(post('/hoteles', hotel)),
    actualizar: (id, cambios) => datos(patch(`/hoteles/${id}`, cambios)),
    eliminar: (id) => borrar(`/hoteles/${id}`),
    crearHabitacion: (hotelId, habitacion) => datos(post(`/hoteles/${hotelId}/habitaciones`, habitacion)),
    actualizarHabitacion: (hotelId, id, cambios) => datos(patch(`/hoteles/${hotelId}/habitaciones/${id}`, cambios)),
    eliminarHabitacion: (hotelId, id) => borrar(`/hoteles/${hotelId}/habitaciones/${id}`),
  },

  reservas: {
    crear: (reserva) => datos(post('/reservas', reserva)),
    mias: () => datos(pedir('/reservas/mias')),
    listar: (filtros) => datos(pedir('/reservas', { query: filtros })),
    modificar: (id, cambios) => datos(patch(`/reservas/${id}`, cambios)),
    checkIn: (id) => datos(post(`/reservas/${id}/check-in`)),
    checkOut: (id) => datos(post(`/reservas/${id}/check-out`)),
    cancelar: (id, exonerarCargo = false) => datos(post(`/reservas/${id}/cancelar`, { exonerarCargo })),
    /** Devuelve un Blob con el CSV (para Excel) de las reservas que cumplen los filtros. */
    exportar: (filtros) => pedir('/reservas/exportar', { query: filtros, comoArchivo: true }),
  },

  resenas: {
    crear: (resena) => datos(post('/resenas', resena)),
    listar: () => datos(pedir('/resenas')),
    eliminar: (id) => borrar(`/resenas/${id}`),
  },

  temporadas: {
    listar: () => datos(pedir('/temporadas')),
    crear: (temporada) => datos(post('/temporadas', temporada)),
    actualizar: (id, cambios) => datos(patch(`/temporadas/${id}`, cambios)),
    eliminar: (id) => borrar(`/temporadas/${id}`),
  },

  admin: {
    accesos: (dias) => datos(pedir('/admin/accesos', { query: { dias } })),
    metricas: (desde, hasta) => datos(pedir('/admin/metricas', { query: { desde, hasta } })),
  },

  imagenes: {
    /** Sube una imagen (solo administradores) y devuelve la URL pública donde quedó guardada. */
    subir: async (archivo) => {
      const formulario = new FormData()
      formulario.append('imagen', archivo)
      return (await datos(pedir('/imagenes', { metodo: 'POST', formulario }))).url
    },
  },
}
