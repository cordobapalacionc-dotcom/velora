import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

process.env.NODE_ENV = 'test'
process.env.DB_RUTA = ':memory:'

const { crearApp } = await import('../src/app.js')
const { iniciarDb, cerrarDb } = await import('../src/db/conexion.js')
const { hoyISO } = await import('../src/utils/fechas.js')

let servidor, base, tokenAdmin, tokenRecepcion, tokenCliente

function fechaMas(dias) {
  const d = new Date(`${hoyISO()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function api(metodo, ruta, { body, token, agente } = {}) {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(agente ? { 'User-Agent': agente } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const texto = await r.text()
  return { estado: r.status, json: texto ? JSON.parse(texto) : null }
}

const login = async (correo, contrasena, agente) =>
  (await api('POST', '/api/auth/login', { body: { correo, contrasena }, agente })).json?.token

const reservar = (datos, token = tokenCliente) => api('POST', '/api/reservas', { body: datos, token })
const modificar = (id, cambios, token = tokenRecepcion) => api('PATCH', `/api/reservas/${id}`, { body: cambios, token })

before(async () => {
  iniciarDb()
  servidor = crearApp().listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${servidor.address().port}`
  tokenAdmin = await login('admin@velora.com', 'admin123', 'Navegador-Admin')
  tokenRecepcion = await login('recepcion@velora.com', 'recepcion123')
  tokenCliente = (await api('POST', '/api/auth/registro', { body: { nombre: 'Clara Cliente', correo: 'clara@correo.com', contrasena: 'clave1234' } })).json.token
})

after(() => {
  servidor?.close()
  cerrarDb()
})

describe('Modificar reservas', () => {
  test('recepción cambia las fechas y el total se recalcula con el precio acordado', async () => {
    const { json } = await reservar({ hotelId: 'mirador-del-cafe', habitacionId: 'cabana-finca', entrada: fechaMas(10), salida: fechaMas(12), huespedes: 2 })
    const r = await modificar(json.datos.id, { salida: fechaMas(14) })
    assert.equal(r.estado, 200)
    assert.equal(r.json.datos.noches, 4)
    assert.equal(r.json.datos.subtotal, 890000 * 4)
    assert.equal(r.json.datos.total, r.json.datos.subtotal + r.json.datos.impuestos + 180000)
  })

  test('el admin también puede modificar; el cliente no', async () => {
    const { json } = await reservar({ hotelId: 'saffron-tea-garden', habitacionId: 'tatami-clasica', entrada: fechaMas(20), salida: fechaMas(21), huespedes: 1 })
    assert.equal((await modificar(json.datos.id, { huespedes: 2 }, tokenAdmin)).estado, 200)
    assert.equal((await modificar(json.datos.id, { huespedes: 1 }, tokenCliente)).estado, 403)
  })

  test('cambiar de habitación usa el precio de la nueva habitación', async () => {
    const { json } = await reservar({ hotelId: 'mirador-del-cafe', habitacionId: 'cabana-finca', entrada: fechaMas(30), salida: fechaMas(31), huespedes: 2 })
    const r = await modificar(json.datos.id, { habitacionId: 'suite-valle' })
    assert.equal(r.estado, 200)
    assert.equal(r.json.datos.habitacionNombre, 'Suite Valle de Cocora')
    assert.equal(r.json.datos.precioNoche, 1450000)
  })

  test('no permite moverla a fechas ocupadas, pero sí correrla sobre sus propias fechas', async () => {
    const a = (await reservar({ hotelId: 'belvedere-sands', habitacionId: 'vista-jardin', entrada: fechaMas(40), salida: fechaMas(43), huespedes: 2 })).json.datos
    const b = (await reservar({ hotelId: 'belvedere-sands', habitacionId: 'vista-jardin', entrada: fechaMas(45), salida: fechaMas(47), huespedes: 2 })).json.datos
    const choque = await modificar(b.id, { entrada: fechaMas(42) })
    assert.equal(choque.estado, 409)
    assert.match(choque.json.error.mensaje, /ya está reservada/)
    // Correr la reserva A un día: se cruza consigo misma, pero no cuenta como conflicto.
    assert.equal((await modificar(a.id, { entrada: fechaMas(41), salida: fechaMas(44) })).estado, 200)
  })

  test('valida capacidad y fechas', async () => {
    const { json } = await reservar({ hotelId: 'mirador-del-cafe', habitacionId: 'cabana-finca', entrada: fechaMas(50), salida: fechaMas(52), huespedes: 2 })
    assert.equal((await modificar(json.datos.id, { huespedes: 5 })).estado, 422)
    assert.equal((await modificar(json.datos.id, { salida: fechaMas(49) })).estado, 422)
    assert.equal((await modificar(json.datos.id, { entrada: fechaMas(-3) })).estado, 422)
    assert.equal((await modificar(json.datos.id, { salida: fechaMas(90) })).estado, 422, 'más de 30 noches')
    assert.equal((await modificar(json.datos.id, { total: 1 })).estado, 400, 'no se aceptan montos del cliente')
  })

  test('con check-in hecho solo cambian salida y huéspedes; cancelada no se modifica', async () => {
    const { json } = await reservar({ hotelId: 'st-moritz-crystal', habitacionId: 'habitacion-alpina', entrada: fechaMas(0), salida: fechaMas(2), huespedes: 1 })
    await api('POST', `/api/reservas/${json.datos.id}/check-in`, { token: tokenRecepcion })
    assert.equal((await modificar(json.datos.id, { entrada: fechaMas(1) })).estado, 422)
    assert.equal((await modificar(json.datos.id, { habitacionId: 'suite-chimenea' })).estado, 422)
    const extender = await modificar(json.datos.id, { salida: fechaMas(4) })
    assert.equal(extender.estado, 200)
    assert.equal(extender.json.datos.estado, 'check-in')

    const otra = (await reservar({ hotelId: 'st-moritz-crystal', habitacionId: 'suite-chimenea', entrada: fechaMas(60), salida: fechaMas(61), huespedes: 2 })).json.datos
    await api('POST', `/api/reservas/${otra.id}/cancelar`, { token: tokenCliente })
    assert.equal((await modificar(otra.id, { salida: fechaMas(62) })).estado, 422)
  })

  test('dos modificaciones simultáneas hacia la misma habitación y fechas: solo una gana', async () => {
    const datos = (dia) => ({ hotelId: 'azure-vault-cloister', habitacionId: 'suite-caldera', entrada: fechaMas(dia), salida: fechaMas(dia + 1), huespedes: 2 })
    const r1 = (await reservar(datos(70))).json.datos
    const r2 = (await reservar(datos(72))).json.datos
    const destino = { entrada: fechaMas(80), salida: fechaMas(82) }
    const resultados = await Promise.all([modificar(r1.id, destino), modificar(r2.id, destino, tokenAdmin)])
    assert.deepEqual(resultados.map((r) => r.estado).sort(), [200, 409])
  })
})

describe('Dashboard de accesos', () => {
  test('registra inicios exitosos, fallidos y registros', async () => {
    await login('clara@correo.com', 'contraseña-mala1')
    await login('nadie@correo.com', 'clave1234')
    const { estado, json } = await api('GET', '/api/admin/accesos?dias=7', { token: tokenAdmin })
    assert.equal(estado, 200)
    const { resumen, porDia, usuarios, recientes } = json.datos
    assert.equal(resumen.iniciosExitosos, 2, 'admin + recepción')
    assert.equal(resumen.intentosFallidos, 2)
    assert.equal(resumen.registros, 1)
    assert.equal(resumen.usuariosDistintos, 3, 'admin, recepción y la clienta que se registró')
    assert.equal(porDia.length, 7)
    assert.equal(porDia.at(-1).dia, hoyISO())
    assert.equal(porDia.at(-1).exitosos, resumen.iniciosExitosos, 'la gráfica cuenta lo mismo que el contador')
    assert.deepEqual(usuarios.map((u) => u.correo).sort(), ['admin@velora.com', 'clara@correo.com', 'recepcion@velora.com'])
    const fallido = recientes.find((r) => r.correo === 'nadie@correo.com')
    assert.equal(fallido.exito, false)
    assert.equal(fallido.nombre, null)
    assert.equal(recientes.find((r) => r.navegador === 'Navegador-Admin')?.correo, 'admin@velora.com')
  })

  test('solo el admin puede verlo', async () => {
    assert.equal((await api('GET', '/api/admin/accesos', { token: tokenRecepcion })).estado, 403)
    assert.equal((await api('GET', '/api/admin/accesos', { token: tokenCliente })).estado, 403)
    assert.equal((await api('GET', '/api/admin/accesos')).estado, 401)
    assert.equal((await api('GET', '/api/admin/accesos?dias=500', { token: tokenAdmin })).estado, 400)
  })
})
