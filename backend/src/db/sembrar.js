import bcrypt from 'bcryptjs'
import { config } from '../config/env.js'
import { colecciones, destinos, hoteles, temporadas } from './datos/semilla.js'

// Las cuentas demo tienen contraseñas conocidas: nunca se crean en producción.
const USUARIOS_DEMO = [
  { nombre: 'Administrador Velora', correo: 'admin@velora.com', contrasena: 'admin123', rol: 'admin' },
  { nombre: 'Recepción Velora', correo: 'recepcion@velora.com', contrasena: 'recepcion123', rol: 'recepcionista' },
]

const traducciones = (en) => JSON.stringify(en ? { en } : {})

function sembrarUsuarios(db) {
  const insertar = db.prepare(
    `INSERT OR IGNORE INTO usuarios (nombre, correo, contrasena_hash, rol)
     VALUES (:nombre, :correo, :hash, :rol)`
  )
  for (const u of USUARIOS_DEMO) {
    insertar.run({ nombre: u.nombre, correo: u.correo, hash: bcrypt.hashSync(u.contrasena, 10), rol: u.rol })
  }
}

function sembrarCatalogo(db) {
  const insDestino = db.prepare(
    'INSERT INTO destinos (id, nombre, pais, imagen, traducciones) VALUES (:id, :nombre, :pais, :imagen, :traducciones)'
  )
  const insColeccion = db.prepare(
    'INSERT INTO colecciones (id, nombre, imagen, traducciones) VALUES (:id, :nombre, :imagen, :traducciones)'
  )
  const insHotel = db.prepare(
    `INSERT INTO hoteles (id, nombre, destino_id, ubicacion, calificacion, num_resenas, precio_noche,
                          descripcion_corta, descripcion, reputacion, testimonio, traducciones)
     VALUES (:id, :nombre, :destinoId, :ubicacion, :calificacion, :numResenas, :precioNoche,
             :descripcionCorta, :descripcion, :reputacion, :testimonio, :traducciones)`
  )
  const insHotelColeccion = db.prepare('INSERT INTO hotel_colecciones (hotel_id, coleccion_id) VALUES (?, ?)')
  const insImagen = db.prepare('INSERT INTO hotel_imagenes (hotel_id, url, orden) VALUES (?, ?, ?)')
  const insHabitacion = db.prepare(
    `INSERT INTO habitaciones (hotel_id, id, nombre, detalle, precio, capacidad, imagen, destacado, traducciones)
     VALUES (:hotelId, :id, :nombre, :detalle, :precio, :capacidad, :imagen, :destacado, :traducciones)`
  )
  const insTemporada = db.prepare(
    'INSERT INTO temporadas (nombre, inicio, fin, recargo, hotel_id) VALUES (:nombre, :inicio, :fin, :recargo, :hotelId)'
  )

  destinos.forEach(({ en, ...d }) => insDestino.run({ ...d, traducciones: traducciones(en) }))
  colecciones.forEach(({ en, ...c }) => insColeccion.run({ ...c, traducciones: traducciones(en) }))

  for (const h of hoteles) {
    insHotel.run({
      id: h.id,
      nombre: h.nombre,
      destinoId: h.destinoId,
      ubicacion: h.ubicacion,
      calificacion: h.calificacion,
      numResenas: h.numResenas,
      precioNoche: h.precioNoche,
      descripcionCorta: h.descripcionCorta,
      descripcion: h.descripcion,
      reputacion: JSON.stringify(h.reputacion),
      testimonio: h.testimonio ? JSON.stringify(h.testimonio) : null,
      traducciones: traducciones(h.en),
    })
    h.colecciones.forEach((c) => insHotelColeccion.run(h.id, c))
    h.imagenes.forEach((url, i) => insImagen.run(h.id, url, i))
    for (const hab of h.habitaciones) {
      insHabitacion.run({
        hotelId: h.id,
        id: hab.id,
        nombre: hab.nombre,
        detalle: hab.detalle ?? '',
        precio: hab.precio,
        capacidad: hab.capacidad ?? 2,
        imagen: hab.imagen,
        destacado: hab.destacado ? 1 : 0,
        traducciones: traducciones(hab.en),
      })
    }
  }

  // En las pruebas no se cargan temporadas: así los precios esperados no dependen del día en que se corren.
  if (config.entorno !== 'test') temporadas.forEach((t) => insTemporada.run(t))
}

export function sembrarSiVacia(db) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM destinos').get()
  db.exec('BEGIN')
  try {
    if (!config.esProduccion) sembrarUsuarios(db)
    if (total === 0) sembrarCatalogo(db)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
