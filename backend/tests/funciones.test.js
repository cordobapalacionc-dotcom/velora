import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

process.env.NODE_ENV = 'test'
process.env.DB_RUTA = ':memory:'

const { crearApp } = await import('../src/app.js')
const { iniciarDb, cerrarDb, obtenerDb } = await import('../src/db/conexion.js')
const { hoyISO } = await import('../src/utils/fechas.js')
const { buzonDePruebas } = await import('../src/modules/correo/correo.servicio.js')
const { accesosRepositorio } = await import('../src/modules/admin/accesos.repositorio.js')

let servidor, base, tokenAdmin, tokenRecepcion, tokenCliente, tokenOtro

function fechaMas(dias) {
  const d = new Date(`${hoyISO()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function api(metodo, ruta, { body, token } = {}) {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const texto = await r.text()
  return { estado: r.status, json: texto ? JSON.parse(texto) : null }
}

const login = (correo, contrasena) => api('POST', '/api/auth/login', { body: { correo, contrasena } })
const registrar = async (nombre, correo, contrasena = 'clave1234') =>
  (await api('POST', '/api/auth/registro', { body: { nombre, correo, contrasena } })).json.token
const reservar = (datos, token = tokenCliente) => api('POST', '/api/reservas', { body: datos, token })
const correosPara = (correo) => buzonDePruebas.filter((m) => m.para === correo)

before(async () => {
  iniciarDb()
  servidor = crearApp().listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${servidor.address().port}`
  tokenAdmin = (await login('admin@velora.com', 'admin123')).json.token
  tokenRecepcion = (await login('recepcion@velora.com', 'recepcion123')).json.token
  tokenCliente = await registrar('Clara Cliente', 'clara@correo.com')
  tokenOtro = await registrar('Otro Huésped', 'otro@correo.com')
})

after(() => {
  servidor?.close()
  cerrarDb()
})

describe('Catálogo: búsqueda, colecciones y traducciones', () => {
  test('la búsqueda ignora tildes y encuentra por destino, país o nombre en inglés', async () => {
    const ids = async (q) => (await api('GET', `/api/hoteles?destino=${encodeURIComponent(q)}`)).json.datos.map((h) => h.id)
    assert.ok((await ids('japon')).includes('saffron-tea-garden'))
    assert.ok((await ids('Cartagena de Indias')).includes('refugio-colonial-cartagena'))
    assert.ok((await ids('Coffee Region')).includes('mirador-del-cafe'))
    assert.deepEqual((await ids('marte')), [])
  })

  test('filtra por colección', async () => {
    const { json } = await api('GET', '/api/hoteles?coleccion=montana')
    assert.deepEqual(json.datos.map((h) => h.id).sort(), ['mirador-del-cafe', 'st-moritz-crystal'])
  })

  test('cada hotel trae sus colecciones, su destino y los textos en inglés', async () => {
    const { json } = await api('GET', '/api/hoteles/mirador-del-cafe')
    assert.deepEqual(json.datos.colecciones.sort(), ['cafe-colombiano', 'montana'])
    assert.equal(json.datos.destino.traducciones.en.nombre, 'Coffee Region')
    assert.match(json.datos.traducciones.en.descripcion, /coffee/i)
    assert.equal(json.datos.habitaciones[0].traducciones.en.nombre, 'Farm Cabin')
  })

  test('el admin crea un hotel con colecciones y textos en inglés; una colección inexistente se rechaza', async () => {
    const datos = { nombre: 'Casa del Mar', destinoId: 'cartagena', ubicacion: 'Cartagena', precioNoche: 400000 }
    const malo = await api('POST', '/api/hoteles', { body: { ...datos, colecciones: ['no-existe'] }, token: tokenAdmin })
    assert.equal(malo.estado, 422)

    const { estado, json } = await api('POST', '/api/hoteles', {
      body: { ...datos, colecciones: ['villas-mar'], traducciones: { en: { descripcionCorta: 'By the sea' } } },
      token: tokenAdmin,
    })
    assert.equal(estado, 201)
    assert.deepEqual(json.datos.colecciones, ['villas-mar'])
    assert.equal(json.datos.traducciones.en.descripcionCorta, 'By the sea')
  })

  test('la configuración pública expone la tasa del dólar y la política de cancelación', async () => {
    const { json } = await api('GET', '/api/catalogo/configuracion')
    assert.equal(json.datos.tasaUsd, 4000)
    assert.equal(json.datos.cancelacionGratisDias, 2)
  })
})

describe('Precios por temporada', () => {
  test('solo el admin gestiona temporadas y las fechas se validan', async () => {
    const datos = { nombre: 'Festival', inicio: fechaMas(20), fin: fechaMas(21), recargo: 50, hotelId: 'saffron-tea-garden' }
    assert.equal((await api('POST', '/api/temporadas', { body: datos, token: tokenRecepcion })).estado, 403)
    assert.equal((await api('POST', '/api/temporadas', { body: { ...datos, fin: fechaMas(19) }, token: tokenAdmin })).estado, 400)
    assert.equal((await api('POST', '/api/temporadas', { body: { ...datos, recargo: 0 }, token: tokenAdmin })).estado, 400)
    assert.equal((await api('POST', '/api/temporadas', { body: { ...datos, hotelId: 'no-existe' }, token: tokenAdmin })).estado, 422)
    const { estado, json } = await api('POST', '/api/temporadas', { body: datos, token: tokenAdmin })
    assert.equal(estado, 201)
    assert.equal(json.datos.hotelNombre, 'Jardín de Té de Saffron')
  })

  test('la cotización y la reserva cobran cada noche según su temporada (la de mayor recargo manda)', async () => {
    // Un descuento que se cruza con el festival en una noche: allí manda el +50 %.
    await api('POST', '/api/temporadas', {
      body: { nombre: 'Baja', inicio: fechaMas(21), fin: fechaMas(22), recargo: -20, hotelId: 'saffron-tea-garden' },
      token: tokenAdmin,
    })
    const consulta = `habitacionId=tatami-clasica&entrada=${fechaMas(19)}&salida=${fechaMas(23)}&huespedes=2`
    const { json } = await api('GET', `/api/hoteles/saffron-tea-garden/cotizacion?${consulta}`)
    const precios = json.datos.detalleNoches.map((n) => n.precio)
    assert.deepEqual(precios, [1450000, 2175000, 2175000, 1160000])
    assert.equal(json.datos.subtotal, 6960000)
    assert.equal(json.datos.detalleNoches[1].temporada.nombre, 'Festival')
    assert.equal(json.datos.disponible, true)

    const reserva = await reservar({ hotelId: 'saffron-tea-garden', habitacionId: 'tatami-clasica', entrada: fechaMas(19), salida: fechaMas(23), huespedes: 2 })
    assert.equal(reserva.estado, 201)
    assert.equal(reserva.json.datos.subtotal, 6960000)
    assert.equal(reserva.json.datos.precioNoche, 1450000, 'se guarda el precio base acordado')
    assert.equal(reserva.json.datos.total, 6960000 + Math.round(6960000 * 0.19) + 180000)

    const otra = await api('GET', `/api/hoteles/saffron-tea-garden/cotizacion?${consulta}`)
    assert.equal(otra.json.datos.disponible, false)
    assert.equal(otra.json.datos.motivo, 'ocupada')
  })

  test('las temporadas de un hotel no afectan a los demás', async () => {
    const consulta = `habitacionId=cabana-finca&entrada=${fechaMas(20)}&salida=${fechaMas(21)}`
    const { json } = await api('GET', `/api/hoteles/mirador-del-cafe/cotizacion?${consulta}`)
    assert.equal(json.datos.subtotal, 890000)
  })
})

describe('Calendario de disponibilidad', () => {
  test('muestra las noches ocupadas y las temporadas, sin datos de los huéspedes', async () => {
    const { estado, json } = await api('GET', `/api/hoteles/saffron-tea-garden/calendario?desde=${hoyISO()}&hasta=${fechaMas(60)}`)
    assert.equal(estado, 200)
    const tatami = json.datos.habitaciones.find((h) => h.id === 'tatami-clasica')
    assert.deepEqual(tatami.ocupadas, [{ entrada: fechaMas(19), salida: fechaMas(23) }])
    assert.deepEqual(json.datos.temporadas.map((t) => t.nombre).sort(), ['Baja', 'Festival'])
    assert.doesNotMatch(JSON.stringify(json), /clara|correo|codigo/i)
  })

  test('valida el rango de fechas', async () => {
    assert.equal((await api('GET', `/api/hoteles/saffron-tea-garden/calendario?desde=${fechaMas(5)}&hasta=${fechaMas(1)}`)).estado, 400)
    assert.equal((await api('GET', `/api/hoteles/saffron-tea-garden/calendario?desde=${hoyISO()}&hasta=${fechaMas(500)}`)).estado, 400)
  })
})

describe('Política de cancelación', () => {
  test('con más de 48 horas de anticipación cancelar es gratis', async () => {
    const { json } = await reservar({ hotelId: 'belvedere-sands', habitacionId: 'vista-jardin', entrada: fechaMas(10), salida: fechaMas(12), huespedes: 2 })
    assert.equal(json.datos.cancelacion.gratisHasta, fechaMas(8))
    assert.equal(json.datos.cancelacion.cargoSiCancelaHoy, 0)

    const r = await api('POST', `/api/reservas/${json.datos.id}/cancelar`, { token: tokenCliente })
    assert.equal(r.estado, 200)
    assert.equal(r.json.datos.estado, 'cancelada')
    assert.equal(r.json.datos.cargoCancelacion, 0)
  })

  test('dentro de las 48 horas se cobra una noche; el cliente no puede exonerarla', async () => {
    const { json } = await reservar({ hotelId: 'belvedere-sands', habitacionId: 'vista-jardin', entrada: fechaMas(1), salida: fechaMas(3), huespedes: 2 })
    const cargo = Math.round(2290000 * 1.19)
    assert.equal(json.datos.cancelacion.cargoSiCancelaHoy, cargo)

    const exonerar = await api('POST', `/api/reservas/${json.datos.id}/cancelar`, { body: { exonerarCargo: true }, token: tokenCliente })
    assert.equal(exonerar.estado, 403)

    const r = await api('POST', `/api/reservas/${json.datos.id}/cancelar`, { token: tokenCliente })
    assert.equal(r.json.datos.cargoCancelacion, cargo)
    const aviso = correosPara('clara@correo.com').at(-1)
    assert.match(aviso.asunto, /cancelada/i)
    assert.match(aviso.texto, /se cobra una noche/)
  })

  test('el hotel puede cancelar sin cargo aunque sea tarde', async () => {
    const { json } = await reservar({ hotelId: 'belvedere-sands', habitacionId: 'suite-mar', entrada: fechaMas(1), salida: fechaMas(2), huespedes: 2 })
    const r = await api('POST', `/api/reservas/${json.datos.id}/cancelar`, { body: { exonerarCargo: true }, token: tokenRecepcion })
    assert.equal(r.estado, 200)
    assert.equal(r.json.datos.cargoCancelacion, 0)
  })

  test('al reservar llega un correo de confirmación con la política', async () => {
    const confirmacion = correosPara('clara@correo.com').find((m) => /confirmada/.test(m.asunto))
    assert.ok(confirmacion)
    assert.match(confirmacion.texto, /VEL-\d{6}/)
    assert.match(confirmacion.texto, /cancelar gratis|se cobra una noche/)
  })
})

describe('Historial de modificaciones y aviso al huésped', () => {
  test('cada cambio guarda quién lo hizo y avisa al huésped por correo', async () => {
    const { json } = await reservar({ hotelId: 'mirador-del-cafe', habitacionId: 'suite-valle', entrada: fechaMas(30), salida: fechaMas(32), huespedes: 2 })
    const antes = correosPara('clara@correo.com').length
    const r = await api('PATCH', `/api/reservas/${json.datos.id}`, { body: { salida: fechaMas(33) }, token: tokenRecepcion })
    assert.equal(r.estado, 200)
    const [cambio] = r.json.datos.modificaciones
    assert.equal(cambio.por, 'recepcion@velora.com')
    assert.match(cambio.detalle, /salida/)
    assert.equal(cambio.totalAnterior, json.datos.total)
    assert.equal(cambio.totalNuevo, r.json.datos.total)

    const aviso = correosPara('clara@correo.com').at(-1)
    assert.equal(correosPara('clara@correo.com').length, antes + 1)
    assert.match(aviso.asunto, /Cambios en tu reserva/)

    const sinCambios = await api('PATCH', `/api/reservas/${json.datos.id}`, { body: { salida: fechaMas(33) }, token: tokenRecepcion })
    assert.equal(sinCambios.json.datos.modificaciones.length, 1, 'guardar lo mismo no agrega historial')
  })
})

describe('Reseñas verificadas', () => {
  let reservaId

  test('no se puede opinar antes de terminar la estadía', async () => {
    const { json } = await reservar({ hotelId: 'azure-vault-cloister', habitacionId: 'suite-caldera', entrada: hoyISO(), salida: fechaMas(2), huespedes: 2 })
    reservaId = json.datos.id
    const resena = { reservaId, calificacion: 5, limpieza: 5, ubicacion: 5, calidadPrecio: 4, atencion: 5, comentario: 'Una estadía inolvidable.' }
    assert.equal((await api('POST', '/api/resenas', { body: resena, token: tokenCliente })).estado, 422)
  })

  test('después del check-out el huésped opina una sola vez y la calificación del hotel cambia', async () => {
    await api('POST', `/api/reservas/${reservaId}/check-in`, { token: tokenRecepcion })
    await api('POST', `/api/reservas/${reservaId}/check-out`, { token: tokenRecepcion })
    const resena = { reservaId, calificacion: 5, limpieza: 5, ubicacion: 5, calidadPrecio: 4, atencion: 5, comentario: 'Una estadía inolvidable.' }

    assert.equal((await api('POST', '/api/resenas', { body: resena, token: tokenOtro })).estado, 404, 'otro usuario no puede opinar por esta reserva')
    assert.equal((await api('POST', '/api/resenas', { body: { ...resena, calificacion: 6 }, token: tokenCliente })).estado, 400)
    assert.equal((await api('POST', '/api/resenas', { body: { ...resena, comentario: 'corto' }, token: tokenCliente })).estado, 400)

    const creada = await api('POST', '/api/resenas', { body: resena, token: tokenCliente })
    assert.equal(creada.estado, 201)
    assert.equal(creada.json.datos.autor, 'Clara C.')
    assert.equal((await api('POST', '/api/resenas', { body: resena, token: tokenCliente })).estado, 409)

    const hotel = (await api('GET', '/api/hoteles/azure-vault-cloister')).json.datos
    assert.equal(hotel.numResenas, 157, '156 importadas + 1 verificada')
    assert.equal(hotel.reputacion.total, 157)

    const mias = (await api('GET', '/api/reservas/mias', { token: tokenCliente })).json.datos
    assert.equal(mias.find((r) => r.id === reservaId).resenaId, creada.json.datos.id)
  })

  test('la lista pública no muestra el correo ni el apellido completo', async () => {
    const { json } = await api('GET', '/api/hoteles/azure-vault-cloister/resenas')
    assert.equal(json.datos.total, 1)
    assert.equal(json.datos.resenas[0].autor, 'Clara C.')
    assert.doesNotMatch(JSON.stringify(json), /clara@correo\.com|Cliente/)
  })

  test('el admin puede retirar una reseña y la calificación se recalcula', async () => {
    const [resena] = (await api('GET', '/api/resenas', { token: tokenAdmin })).json.datos
    assert.equal(resena.autorCorreo, 'clara@correo.com', 'el admin sí ve el correo para moderar')
    assert.equal((await api('DELETE', `/api/resenas/${resena.id}`, { token: tokenRecepcion })).estado, 403)
    assert.equal((await api('DELETE', `/api/resenas/${resena.id}`, { token: tokenAdmin })).estado, 204)
    assert.equal((await api('GET', '/api/hoteles/azure-vault-cloister')).json.datos.numResenas, 156)
  })

  test('la base de datos rechaza reseñas de estadías no terminadas aunque se salten la API', () => {
    const { id, usuario_id: usuarioId } = obtenerDb().prepare("SELECT id, usuario_id FROM reservas WHERE estado = 'confirmada' LIMIT 1").get()
    assert.throws(
      () =>
        obtenerDb()
          .prepare(
            `INSERT INTO resenas (reserva_id, usuario_id, hotel_id, calificacion, limpieza, ubicacion, calidad_precio, atencion, comentario)
             SELECT id, ?, hotel_id, 5, 5, 5, 5, 5, 'Reseña falsa de prueba' FROM reservas WHERE id = ?`
          )
          .run(usuarioId, id),
      /RESENA_NO_VERIFICADA/
    )
  })
})

describe('Bloqueo por intentos fallidos', () => {
  test('tras 5 intentos fallidos la cuenta se bloquea, incluso con la contraseña correcta', async () => {
    await registrar('Bea Bloqueo', 'bea@correo.com')
    const mensajes = []
    for (let i = 0; i < 4; i++) {
      const r = await login('bea@correo.com', 'equivocada1')
      assert.equal(r.estado, 401)
      mensajes.push(r.json.error.mensaje)
    }
    assert.doesNotMatch(mensajes[1], /quedan/)
    assert.match(mensajes[2], /quedan 2 intentos/)
    assert.match(mensajes[3], /queda 1 intento/)

    const quinto = await login('bea@correo.com', 'equivocada1')
    assert.equal(quinto.estado, 429)
    assert.equal(quinto.json.error.codigo, 'CUENTA_BLOQUEADA')
    assert.ok(Date.parse(quinto.json.error.detalles.desbloqueo) > Date.now())

    const correcta = await login('bea@correo.com', 'clave1234')
    assert.equal(correcta.estado, 429, 'durante el bloqueo ni la contraseña correcta sirve')

    const { resumen } = (await api('GET', '/api/admin/accesos?dias=1', { token: tokenAdmin })).json.datos
    assert.ok(resumen.intentosBloqueados >= 1)
  })

  test('un correo inexistente se comporta igual (no revela qué cuentas existen)', async () => {
    for (let i = 0; i < 4; i++) assert.equal((await login('nadie@correo.com', 'x')).estado, 401)
    assert.equal((await login('nadie@correo.com', 'x')).estado, 429)
  })

  test('restablecer la contraseña levanta el bloqueo', async () => {
    await api('POST', '/api/auth/recuperar', { body: { correo: 'bea@correo.com' } })
    const token = correosPara('bea@correo.com').at(-1).texto.match(/token=([A-Za-z0-9_-]{43})/)[1]
    assert.equal((await api('POST', '/api/auth/restablecer', { body: { token, contrasena: 'nueva1234' } })).estado, 200)
    assert.equal((await login('bea@correo.com', 'nueva1234')).estado, 200)
  })

  test('un inicio de sesión correcto reinicia el contador', async () => {
    await registrar('Dani Despistado', 'dani@correo.com')
    for (let i = 0; i < 4; i++) await login('dani@correo.com', 'equivocada1')
    assert.equal((await login('dani@correo.com', 'clave1234')).estado, 200)
    assert.equal((await login('dani@correo.com', 'equivocada1')).estado, 401, 'el contador volvió a cero')
  })
})

describe('Recuperar contraseña', () => {
  test('responde lo mismo exista o no la cuenta, y solo envía correo si existe', async () => {
    const antes = buzonDePruebas.length
    const inexistente = await api('POST', '/api/auth/recuperar', { body: { correo: 'fantasma@correo.com' } })
    assert.equal(inexistente.estado, 200)
    assert.equal(buzonDePruebas.length, antes)

    const existente = await api('POST', '/api/auth/recuperar', { body: { correo: 'otro@correo.com' } })
    assert.equal(existente.json.mensaje, inexistente.json.mensaje)
    assert.equal(buzonDePruebas.length, antes + 1)
  })

  test('el enlace cambia la contraseña, cierra las sesiones anteriores y no se puede reutilizar', async () => {
    const tokenViejo = (await login('otro@correo.com', 'clave1234')).json.token
    const enlace = correosPara('otro@correo.com').at(-1).texto.match(/token=([A-Za-z0-9_-]{43})/)[1]

    assert.equal((await api('POST', '/api/auth/restablecer', { body: { token: enlace, contrasena: 'corta' } })).estado, 400)
    const r = await api('POST', '/api/auth/restablecer', { body: { token: enlace, contrasena: 'otraClave99' } })
    assert.equal(r.estado, 200)
    assert.ok(r.json.token, 'queda con la sesión iniciada')

    assert.equal((await api('GET', '/api/auth/yo', { token: tokenViejo })).estado, 401, 'el token anterior ya no sirve')
    assert.equal((await api('GET', '/api/auth/yo', { token: r.json.token })).estado, 200)
    assert.equal((await login('otro@correo.com', 'clave1234')).estado, 401)
    assert.equal((await login('otro@correo.com', 'otraClave99')).estado, 200)
    assert.equal((await api('POST', '/api/auth/restablecer', { body: { token: enlace, contrasena: 'otraMas123' } })).estado, 422)
    assert.match(correosPara('otro@correo.com').at(-1).asunto, /contraseña de Velora cambió/)
  })

  test('pedir un enlace nuevo invalida el anterior', async () => {
    await api('POST', '/api/auth/recuperar', { body: { correo: 'clara@correo.com' } })
    const primero = correosPara('clara@correo.com').at(-1).texto.match(/token=([A-Za-z0-9_-]{43})/)[1]
    await api('POST', '/api/auth/recuperar', { body: { correo: 'clara@correo.com' } })
    assert.equal((await api('POST', '/api/auth/restablecer', { body: { token: primero, contrasena: 'clave5678' } })).estado, 422)
  })
})

describe('Exportar reservas a Excel', () => {
  test('el admin descarga un CSV con separador ";" y BOM, y las fórmulas quedan neutralizadas', async () => {
    const tokenRaro = await registrar('=HYPERLINK("x")', 'raro@correo.com')
    await reservar({ hotelId: 'mirador-del-cafe', habitacionId: 'cabana-familiar-cafe', entrada: fechaMas(40), salida: fechaMas(41), huespedes: 2 }, tokenRaro)

    const r = await fetch(`${base}/api/reservas/exportar?q=raro`, { headers: { Authorization: `Bearer ${tokenAdmin}` } })
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type'), /text\/csv/)
    assert.match(r.headers.get('content-disposition'), /reservas-velora-.*\.csv/)
    const texto = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await r.arrayBuffer())
    assert.ok(texto.startsWith('﻿Código;Estado;Hotel;'))
    const lineas = texto.trim().split('\r\n')
    assert.equal(lineas.length, 2, 'encabezado + 1 reserva filtrada')
    assert.ok(lineas[1].includes(`"'=HYPERLINK(""x"")"`), lineas[1])
  })

  test('recepción no puede exportar', async () => {
    assert.equal((await api('GET', '/api/reservas/exportar', { token: tokenRecepcion })).estado, 403)
  })
})

describe('Métricas de ocupación e ingresos', () => {
  test('calcula ocupación, ingresos repartidos por noche y tarifa promedio', async () => {
    const hotel = (await api('POST', '/api/hoteles', {
      body: { nombre: 'Hotel Métricas', destinoId: 'kioto', ubicacion: 'Kioto', precioNoche: 100000 },
      token: tokenAdmin,
    })).json.datos
    const reserva = await reservar({ hotelId: hotel.id, habitacionId: 'habitacion-estandar', entrada: fechaMas(3), salida: fechaMas(5), huespedes: 2 })
    assert.equal(reserva.estado, 201)
    const total = 200000 + 38000 + 180000

    const completo = (await api('GET', `/api/admin/metricas?desde=${hoyISO()}&hasta=${fechaMas(10)}`, { token: tokenAdmin })).json.datos
    const fila = completo.porHotel.find((h) => h.hotelId === hotel.id)
    assert.deepEqual([fila.nochesVendidas, fila.ocupacion, fila.ingresos], [2, 0.2, total])
    assert.equal(completo.agrupacion, 'dia')
    assert.equal(completo.serie.length, 10)

    // Si el periodo solo toca una de las dos noches, solo cuenta la mitad del total.
    const parcial = (await api('GET', `/api/admin/metricas?desde=${fechaMas(4)}&hasta=${fechaMas(10)}`, { token: tokenAdmin })).json.datos
    assert.equal(parcial.porHotel.find((h) => h.hotelId === hotel.id).ingresos, total / 2)

    const anual = (await api('GET', `/api/admin/metricas?desde=${hoyISO()}&hasta=${fechaMas(365)}`, { token: tokenAdmin })).json.datos
    assert.equal(anual.agrupacion, 'mes')
    assert.ok(anual.resumen.tarifaPromedio > 0)
    assert.ok(anual.resumen.ocupacion > 0 && anual.resumen.ocupacion < 1)
  })

  test('cuenta las cancelaciones y los cargos cobrados', async () => {
    const { resumen } = (await api('GET', `/api/admin/metricas?desde=${hoyISO()}&hasta=${fechaMas(1)}`, { token: tokenAdmin })).json.datos
    assert.ok(resumen.cancelaciones >= 3)
    assert.equal(resumen.cargosCancelacion, Math.round(2290000 * 1.19))
    assert.ok(resumen.tasaCancelacion > 0)
  })

  test('solo el admin ve las métricas y el periodo se valida', async () => {
    assert.equal((await api('GET', `/api/admin/metricas?desde=${hoyISO()}&hasta=${fechaMas(1)}`, { token: tokenRecepcion })).estado, 403)
    assert.equal((await api('GET', `/api/admin/metricas?desde=${fechaMas(5)}&hasta=${hoyISO()}`, { token: tokenAdmin })).estado, 400)
  })
})

describe('Retención de datos personales', () => {
  test('los registros de acceso de más de 90 días se borran', () => {
    obtenerDb()
      .prepare("INSERT INTO inicios_sesion (correo, tipo, exito, ip, fecha) VALUES ('viejo@correo.com', 'login', 1, '1.2.3.4', '2000-01-01T00:00:00.000Z')")
      .run()
    assert.equal(accesosRepositorio.purgar(90), 1)
    assert.equal(obtenerDb().prepare("SELECT COUNT(*) AS n FROM inicios_sesion WHERE correo = 'viejo@correo.com'").get().n, 0)
  })
})
