// Cliente de la API del backend (carpeta /backend). Cambia la URL con VITE_API_URL en un archivo .env.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

async function pedir(ruta, opciones = {}) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones)
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa que el backend esté encendido (npm run dev en la carpeta backend).')
  }

  const json = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const error = new Error(json?.error?.mensaje ?? `El servidor respondió con un error (${respuesta.status}).`)
    error.estado = respuesta.status
    throw error
  }
  return json
}

/** Devuelve el token JWT del backend para esas credenciales. */
export async function iniciarSesionApi(correo, contrasena) {
  const { token } = await pedir('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena }),
  })
  return token
}

/** Sube una imagen (solo administradores) y devuelve la URL pública donde quedó guardada. */
export async function subirImagen(archivo, token) {
  const formulario = new FormData()
  formulario.append('imagen', archivo)
  const { datos } = await pedir('/imagenes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  })
  return datos.url
}
