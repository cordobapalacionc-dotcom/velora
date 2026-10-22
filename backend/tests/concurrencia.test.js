import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, before, describe, test } from 'node:test'

process.env.NODE_ENV = 'test'
process.env.DB_RUTA = ':memory:'

const { crearApp } = await import('../src/app.js')
const { iniciarDb, cerrarDb, obtenerDb } = await import('../src/db/conexion.js')
const { hoyISO } = await import('../src/utils/fechas.js')

let servidor
let base
const tokens = []

function fechaMas(dias) {
  const d = new Date(`${hoyISO()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function reservar(token, datos) {
  const r = await fetch(`${base}/api/reservas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  })
  return { estado: r.status, json: await r.json() }
}

/** Subconsulta de auditoría: pares de reservas activas de la misma habitación que se cruzan. Debe ser 0. */
function contarSolapamientos(db = obtenerDb()) {
  return db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM reservas a
       JOIN reservas b
         ON b.hotel_id = a.hotel_id AND b.habitacion_id = a.habitacion_id AND b.id > a.id
       WHERE a.estado IN ('confirmada', 'check-in') AND b.estado IN ('confirmada', 'check-in')
         AND a.entrada < b.salida AND a.salida > b.entrada`
    )
    .get().total
}

before(async () => {
  iniciarDb()
  servidor = crearApp().listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${servidor.address().port}`

  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${base}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: `Cliente ${i}`, correo: `cliente${i}@correo.com`, contrasena: 'clave1234' }),
    })
    tokens.push((await r.json()).token)
  }
})

after(() => {
  servidor?.close()
  cerrarDb()
})

describe('Reservas simultáneas por la API', () => {
  test('20 solicitudes a la vez por la misma habitación y fechas: solo 1 gana', async () => {
    const datos = { hotelId: 'saffron-tea-garden', habitacionId: 'suite-onsen', entrada: fechaMas(5), salida: fechaMas(8), huespedes: 2 }

    const resultados = await Promise.all(Array.from({ length: 20 }, (_, i) => reservar(tokens[i % tokens.length], datos)))
    const estados = resultados.map((r) => r.estado)

    assert.equal(estados.filter((e) => e === 201).length, 1, 'exactamente una reserva confirmada')
    assert.equal(estados.filter((e) => e === 409).length, 19, 'las demás reciben 409 Conflicto')
    const rechazo = resultados.find((r) => r.estado === 409)
    assert.match(rechazo.json.error.mensaje, /ya está reservada/)
  })

  test('ráfaga de rangos que se pisan entre sí: nunca quedan reservas solapadas', async () => {
    const habitacion = { hotelId: 'mirador-del-cafe', habitacionId: 'cabana-finca', huespedes: 2 }
    // 40 rangos aleatorios de 1 a 4 noches dentro de una ventana de 20 días.
    const solicitudes = Array.from({ length: 40 }, (_, i) => {
      const inicio = 100 + Math.floor(Math.random() * 20)
      const noches = 1 + Math.floor(Math.random() * 4)
      return reservar(tokens[i % tokens.length], { ...habitacion, entrada: fechaMas(inicio), salida: fechaMas(inicio + noches) })
    })
    const estados = (await Promise.all(solicitudes)).map((r) => r.estado)

    assert.ok(estados.every((e) => e === 201 || e === 409), `solo 201 o 409, recibido: ${[...new Set(estados)]}`)
    assert.ok(estados.includes(201))
    assert.equal(contarSolapamientos(), 0)
  })
})

describe('Triggers de la base de datos (última línea de defensa)', () => {
  // Inserta una copia de una reserva existente con otro id/código, saltándose la API por completo.
  function duplicarReservaConSQL(idOriginal, cambios = {}) {
    obtenerDb()
      .prepare(
        `INSERT INTO reservas (id, codigo, usuario_id, hotel_id, habitacion_id, hotel_nombre, habitacion_nombre,
                               huesped_nombre, huesped_correo, entrada, salida, huespedes, noches, precio_noche,
                               subtotal, impuestos, tarifa_limpieza, total, estado, fecha_cancelacion, cargo_cancelacion)
         SELECT :nuevoId, 'VEL-000001', usuario_id, hotel_id, habitacion_id, hotel_nombre, habitacion_nombre,
                huesped_nombre, huesped_correo, entrada, salida, huespedes, noches, precio_noche,
                subtotal, impuestos, tarifa_limpieza, total, :estado, :fechaCancelacion,
                CASE WHEN :estado = 'cancelada' THEN 0 END
         FROM reservas WHERE id = :idOriginal`
      )
      .run({ nuevoId: crypto.randomUUID(), idOriginal, estado: 'confirmada', fechaCancelacion: null, ...cambios })
  }

  test('un INSERT manual que se solapa es rechazado por el trigger', () => {
    const { id } = obtenerDb().prepare("SELECT id FROM reservas WHERE estado = 'confirmada' LIMIT 1").get()
    assert.throws(() => duplicarReservaConSQL(id), /RESERVA_SOLAPADA/)
    assert.equal(contarSolapamientos(), 0)
  })

  test('una reserva cancelada sí se puede guardar, pero no reactivarse si la habitación ya está ocupada', () => {
    const { id } = obtenerDb().prepare("SELECT id FROM reservas WHERE estado = 'confirmada' LIMIT 1").get()
    duplicarReservaConSQL(id, { estado: 'cancelada', fechaCancelacion: new Date().toISOString() })

    assert.throws(
      () => obtenerDb().prepare("UPDATE reservas SET estado = 'confirmada' WHERE codigo = 'VEL-000001'").run(),
      /RESERVA_SOLAPADA/
    )
  })
})

describe('Bloqueo de transacciones entre conexiones distintas', () => {
  // Simula dos procesos del servidor usando el mismo archivo de base de datos.
  let carpeta, conexionA, conexionB

  before(() => {
    carpeta = mkdtempSync(join(tmpdir(), 'velora-'))
    const ruta = join(carpeta, 'prueba.db')
    const esquema = readFileSync(new URL('../src/db/esquema.sql', import.meta.url), 'utf8')

    conexionA = new DatabaseSync(ruta)
    conexionA.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    conexionA.exec(esquema)
    conexionA.exec(`
      INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES ('Ana', 'ana@correo.com', 'x'), ('Luis', 'luis@correo.com', 'x');
      INSERT INTO destinos (id, nombre, pais, imagen) VALUES ('kioto', 'Kioto', 'Japón', 'http://img');
      INSERT INTO hoteles (id, nombre, destino_id, ubicacion, precio_noche) VALUES ('hotel-a', 'Hotel A', 'kioto', 'Kioto', 100);
      INSERT INTO habitaciones (hotel_id, id, nombre, precio, capacidad, imagen) VALUES ('hotel-a', 'hab-1', 'Hab 1', 100, 2, 'http://img');
    `)

    conexionB = new DatabaseSync(ruta)
    conexionB.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 0;')
  })

  after(() => {
    conexionA?.close()
    conexionB?.close()
    rmSync(carpeta, { recursive: true, force: true })
  })

  const insertarReserva = (db, usuarioId, codigo) =>
    db
      .prepare(
        `INSERT INTO reservas (id, codigo, usuario_id, hotel_id, habitacion_id, hotel_nombre, habitacion_nombre,
                               huesped_nombre, huesped_correo, entrada, salida, huespedes, noches, precio_noche,
                               subtotal, impuestos, tarifa_limpieza, total)
         SELECT ?, ?, ?, 'hotel-a', 'hab-1', 'Hotel A', 'Hab 1', 'x', 'x@x.com', '2030-01-10', '2030-01-12', 2, 2, 100, 200, 0, 0, 200
         WHERE NOT EXISTS (
           SELECT 1 FROM reservas WHERE hotel_id = 'hotel-a' AND habitacion_id = 'hab-1'
             AND estado IN ('confirmada', 'check-in') AND entrada < '2030-01-12' AND salida > '2030-01-10'
         )`
      )
      .run(crypto.randomUUID(), codigo, usuarioId).changes

  test('mientras A tiene la transacción abierta, B no puede empezar a escribir', () => {
    conexionA.exec('BEGIN IMMEDIATE')
    assert.equal(insertarReserva(conexionA, 1, 'VEL-111111'), 1)

    // B intenta reservar lo mismo al mismo tiempo: la BD lo frena con "database is locked".
    assert.throws(() => conexionB.exec('BEGIN IMMEDIATE'), /locked|busy/i)

    conexionA.exec('COMMIT')

    // Ya libre, B entra, pero la subconsulta NOT EXISTS ve la reserva de A y no inserta nada.
    conexionB.exec('BEGIN IMMEDIATE')
    assert.equal(insertarReserva(conexionB, 2, 'VEL-222222'), 0)
    conexionB.exec('COMMIT')

    assert.equal(conexionA.prepare('SELECT COUNT(*) AS n FROM reservas').get().n, 1)
  })

  test('si la transacción se revierte (ROLLBACK), la habitación queda libre', () => {
    conexionA.exec("UPDATE reservas SET estado = 'cancelada', fecha_cancelacion = '2030-01-01', cargo_cancelacion = 0")
    conexionA.exec('BEGIN IMMEDIATE')
    assert.equal(insertarReserva(conexionA, 1, 'VEL-333333'), 1)
    conexionA.exec('ROLLBACK')

    conexionB.exec('BEGIN IMMEDIATE')
    assert.equal(insertarReserva(conexionB, 2, 'VEL-444444'), 1)
    conexionB.exec('COMMIT')
  })
})
