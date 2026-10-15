import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

// Configuración aislada: BD en memoria y entorno de pruebas (antes de importar la app).
process.env.NODE_ENV = 'test'
process.env.DB_RUTA = ':memory:'

const { crearApp } = await import('../src/app.js')
const { iniciarDb, cerrarDb } = await import('../src/db/conexion.js')
const { hoyISO } = await import('../src/utils/fechas.js')

let servidor
let base

function fechaMas(dias) {
  const d = new Date(`${hoyISO()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function api(metodo, ruta, { body, token } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const texto = await respuesta.text()
  return { estado: respuesta.status, json: texto ? JSON.parse(texto) : null }
}

async function login(correo, contrasena) {
  const { json } = await api('POST', '/api/auth/login', { body: { correo, contrasena } })
  return json.token
}

let tokenAdmin, tokenRecepcion, tokenCliente, tokenOtroCliente

before(async () => {
  iniciarDb()
  servidor = crearApp().listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${servidor.address().port}`

  tokenAdmin = await login('admin@velora.com', 'admin123')
  tokenRecepcion = await login('recepcion@velora.com', 'recepcion123')
  tokenCliente = (await api('POST', '/api/auth/registro', { body: { nombre: 'Ana Pérez', correo: 'ANA@correo.com', contrasena: 'clave1234' } })).json.token
  tokenOtroCliente = (await api('POST', '/api/auth/registro', { body: { nombre: 'Luis Gómez', correo: 'luis@correo.com', contrasena: 'clave1234' } })).json.token
})

after(() => {
  servidor?.close()
  cerrarDb()
})

describe('Autenticación', () => {
  test('el registro normaliza el correo y siempre crea clientes', async () => {
    const { estado, json } = await api('GET', '/api/auth/yo', { token: tokenCliente })
    assert.equal(estado, 200)
    assert.equal(json.usuario.correo, 'ana@correo.com')
    assert.equal(json.usuario.rol, 'cliente')
    assert.equal(json.usuario.contrasenaHash, undefined)
  })

  test('no permite asignarse un rol al registrarse', async () => {
    const { estado } = await api('POST', '/api/auth/registro', {
      body: { nombre: 'Intruso', correo: 'x@correo.com', contrasena: 'clave1234', rol: 'admin' },
    })
    assert.equal(estado, 400)
  })

  test('rechaza correos duplicados y contraseñas débiles', async () => {
    const dup = await api('POST', '/api/auth/registro', { body: { nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'clave1234' } })
    assert.equal(dup.estado, 409)
    const debil = await api('POST', '/api/auth/registro', { body: { nombre: 'Ana', correo: 'otra@correo.com', contrasena: 'corta' } })
    assert.equal(debil.estado, 400)
  })

  test('credenciales incorrectas y tokens inválidos devuelven 401', async () => {
    assert.equal((await api('POST', '/api/auth/login', { body: { correo: 'admin@velora.com', contrasena: 'mala' } })).estado, 401)
    assert.equal((await api('GET', '/api/auth/yo', { token: 'token.falso.x' })).estado, 401)
  })
})

describe('Hoteles', () => {
  test('lista y filtra por destino', async () => {
    const { json } = await api('GET', '/api/hoteles?destino=Kioto')
    assert.deepEqual(json.datos.map((h) => h.id), ['saffron-tea-garden'])
    assert.ok(json.datos[0].habitaciones.length > 0)
  })

  test('solo el admin puede crear hoteles', async () => {
    const datos = { nombre: 'Casa Nueva', destinoId: 'kioto', ubicacion: 'Kioto, Japón', precioNoche: 500000 }
    assert.equal((await api('POST', '/api/hoteles', { body: datos, token: tokenCliente })).estado, 403)
    assert.equal((await api('POST', '/api/hoteles', { body: datos, token: tokenRecepcion })).estado, 403)
    const { estado, json } = await api('POST', '/api/hoteles', { body: datos, token: tokenAdmin })
    assert.equal(estado, 201)
    assert.equal(json.datos.habitaciones.length, 1)
  })

  test('rechaza destinos inexistentes y precios no válidos', async () => {
    const malDestino = await api('POST', '/api/hoteles', {
      body: { nombre: 'Hotel X', destinoId: 'marte', ubicacion: 'Marte', precioNoche: 100 },
      token: tokenAdmin,
    })
    assert.equal(malDestino.estado, 422)
    const malPrecio = await api('POST', '/api/hoteles', {
      body: { nombre: 'Hotel X', destinoId: 'kioto', ubicacion: 'Kioto', precioNoche: -5 },
      token: tokenAdmin,
    })
    assert.equal(malPrecio.estado, 400)
  })
})

describe('Reservas', () => {
  const reserva = () => ({
    hotelId: 'mirador-del-cafe',
    habitacionId: 'cabana-finca',
    entrada: fechaMas(10),
    salida: fechaMas(13),
    huespedes: 2,
  })

  test('el servidor calcula el precio e ignora montos del cliente', async () => {
    const conMonto = await api('POST', '/api/reservas', { body: { ...reserva(), total: 1 }, token: tokenCliente })
    assert.equal(conMonto.estado, 400, 'campos desconocidos como "total" se rechazan')

    const { estado, json } = await api('POST', '/api/reservas', { body: reserva(), token: tokenCliente })
    assert.equal(estado, 201)
    const r = json.datos
    assert.equal(r.noches, 3)
    assert.equal(r.subtotal, 890000 * 3)
    assert.equal(r.impuestos, Math.round(890000 * 3 * 0.19))
    assert.equal(r.total, r.subtotal + r.impuestos + 180000)
    assert.equal(r.huespedCorreo, 'ana@correo.com')
    assert.match(r.codigo, /^VEL-\d{6}$/)
  })

  test('impide reservar una habitación ya ocupada en fechas que se cruzan', async () => {
    const cruzada = { ...reserva(), entrada: fechaMas(12), salida: fechaMas(15) }
    assert.equal((await api('POST', '/api/reservas', { body: cruzada, token: tokenOtroCliente })).estado, 409)
    // Llegar el mismo día en que otro huésped sale sí está permitido.
    const contigua = { ...reserva(), entrada: fechaMas(13), salida: fechaMas(14) }
    assert.equal((await api('POST', '/api/reservas', { body: contigua, token: tokenOtroCliente })).estado, 201)
  })

  test('valida fechas y capacidad', async () => {
    const pasado = { ...reserva(), entrada: fechaMas(-2), salida: fechaMas(1) }
    assert.equal((await api('POST', '/api/reservas', { body: pasado, token: tokenCliente })).estado, 400)
    const invertida = { ...reserva(), entrada: fechaMas(20), salida: fechaMas(19) }
    assert.equal((await api('POST', '/api/reservas', { body: invertida, token: tokenCliente })).estado, 400)
    const muyLarga = { ...reserva(), entrada: fechaMas(40), salida: fechaMas(80) }
    assert.equal((await api('POST', '/api/reservas', { body: muyLarga, token: tokenCliente })).estado, 400)
    const sinCapacidad = { ...reserva(), entrada: fechaMas(50), salida: fechaMas(51), huespedes: 5 }
    assert.equal((await api('POST', '/api/reservas', { body: sinCapacidad, token: tokenCliente })).estado, 422)
  })

  test('la disponibilidad refleja las reservas activas', async () => {
    const { json } = await api('GET', `/api/hoteles/mirador-del-cafe/disponibilidad?entrada=${fechaMas(11)}&salida=${fechaMas(12)}&huespedes=2`)
    const cabana = json.datos.find((h) => h.id === 'cabana-finca')
    assert.equal(cabana.disponible, false)
    assert.equal(cabana.motivo, 'ocupada')
  })

  test('cada cliente solo ve sus propias reservas', async () => {
    const mias = await api('GET', '/api/reservas/mias', { token: tokenCliente })
    const id = mias.json.datos[0].id
    assert.equal((await api('GET', `/api/reservas/${id}`, { token: tokenOtroCliente })).estado, 404)
    assert.equal((await api('GET', '/api/reservas', { token: tokenCliente })).estado, 403)
    const todas = await api('GET', '/api/reservas?q=ana', { token: tokenRecepcion })
    assert.equal(todas.estado, 200)
    assert.ok(todas.json.datos.every((r) => r.huespedCorreo === 'ana@correo.com'))
  })

  test('respeta la máquina de estados: confirmada → check-in → check-out', async () => {
    const hoy = { hotelId: 'saffron-tea-garden', habitacionId: 'tatami-clasica', entrada: fechaMas(0), salida: fechaMas(2), huespedes: 1 }
    const { json } = await api('POST', '/api/reservas', { body: hoy, token: tokenCliente })
    const id = json.datos.id

    assert.equal((await api('POST', `/api/reservas/${id}/check-in`, { token: tokenCliente })).estado, 403, 'un cliente no hace check-in')
    assert.equal((await api('POST', `/api/reservas/${id}/check-out`, { token: tokenRecepcion })).estado, 422, 'no hay check-out sin check-in')

    const checkIn = await api('POST', `/api/reservas/${id}/check-in`, { token: tokenRecepcion })
    assert.equal(checkIn.json.datos.estado, 'check-in')
    assert.ok(checkIn.json.datos.fechaCheckIn)

    assert.equal((await api('POST', `/api/reservas/${id}/cancelar`, { token: tokenCliente })).estado, 422, 'no se cancela tras el check-in')

    const checkOut = await api('POST', `/api/reservas/${id}/check-out`, { token: tokenRecepcion })
    assert.equal(checkOut.json.datos.estado, 'check-out')
  })

  test('no permite check-in antes de la fecha de llegada', async () => {
    const futura = { hotelId: 'saffron-tea-garden', habitacionId: 'suite-onsen', entrada: fechaMas(5), salida: fechaMas(6), huespedes: 2 }
    const { json } = await api('POST', '/api/reservas', { body: futura, token: tokenCliente })
    assert.equal((await api('POST', `/api/reservas/${json.datos.id}/check-in`, { token: tokenRecepcion })).estado, 422)
  })

  test('el propietario puede cancelar y la habitación se libera', async () => {
    const datos = { hotelId: 'belvedere-sands', habitacionId: 'vista-jardin', entrada: fechaMas(30), salida: fechaMas(32), huespedes: 2 }
    const { json } = await api('POST', '/api/reservas', { body: datos, token: tokenCliente })
    assert.equal((await api('POST', `/api/reservas/${json.datos.id}/cancelar`, { token: tokenOtroCliente })).estado, 404)
    const cancelada = await api('POST', `/api/reservas/${json.datos.id}/cancelar`, { token: tokenCliente })
    assert.equal(cancelada.json.datos.estado, 'cancelada')
    assert.equal((await api('POST', '/api/reservas', { body: datos, token: tokenOtroCliente })).estado, 201)
  })

  test('no se pueden borrar hoteles ni habitaciones con reservas', async () => {
    assert.equal((await api('DELETE', '/api/hoteles/mirador-del-cafe', { token: tokenAdmin })).estado, 409)
    assert.equal((await api('DELETE', '/api/hoteles/mirador-del-cafe/habitaciones/cabana-finca', { token: tokenAdmin })).estado, 409)
    assert.equal((await api('DELETE', '/api/hoteles/mirador-del-cafe/habitaciones/suite-valle', { token: tokenAdmin })).estado, 204)
  })
})

describe('Robustez', () => {
  test('JSON malformado devuelve 400 y rutas inexistentes 404', async () => {
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo' })
    assert.equal(r.status, 400)
    assert.equal((await api('GET', '/api/no-existe')).estado, 404)
  })
})
