import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'

const carpetaTemporal = mkdtempSync(join(tmpdir(), 'velora-uploads-'))
process.env.NODE_ENV = 'test'
process.env.DB_RUTA = ':memory:'
process.env.UPLOADS_RUTA = carpetaTemporal
process.env.IMAGEN_MAX_MB = '1'

const { crearApp } = await import('../src/app.js')
const { iniciarDb, cerrarDb } = await import('../src/db/conexion.js')
const { default: sharp } = await import('sharp')

// Imágenes reales de 2000×1000 px (más anchas que el máximo de 1600, para comprobar que se reducen).
const lienzo = () => sharp({ create: { width: 2000, height: 1000, channels: 3, background: { r: 169, g: 119, b: 42 } } })
const PNG = await lienzo().png().toBuffer()
// JPG con metadatos EXIF, como una foto de celular: no deben llegar a la imagen publicada.
const JPG = await lienzo().jpeg().withExif({ IFD0: { Copyright: 'Foto de prueba', Make: 'Celular' } }).toBuffer()
const WEBP = await lienzo().webp().toBuffer()

let servidor, base, tokenAdmin, tokenCliente

async function subir(token, contenido, nombre = 'foto.png', tipo = 'image/png', campo = 'imagen') {
  const formulario = new FormData()
  formulario.append(campo, new Blob([contenido], { type: tipo }), nombre)
  const r = await fetch(`${base}/api/imagenes`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formulario,
  })
  return { estado: r.status, json: await r.json() }
}

async function login(correo, contrasena) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena }),
  })
  return (await r.json()).token
}

before(async () => {
  iniciarDb()
  servidor = crearApp().listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${servidor.address().port}`
  tokenAdmin = await login('admin@velora.com', 'admin123')
  const r = await fetch(`${base}/api/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Cliente', correo: 'cliente@correo.com', contrasena: 'clave1234' }),
  })
  tokenCliente = (await r.json()).token
})

after(() => {
  servidor?.close()
  cerrarDb()
  rmSync(carpetaTemporal, { recursive: true, force: true })
})

describe('Subida de imágenes', () => {
  test('el admin sube PNG, JPG y WebP: se guardan como WebP reducido, en tres tamaños y sin metadatos', async () => {
    for (const [contenido, extension, tipo] of [[PNG, 'png', 'image/png'], [JPG, 'jpg', 'image/jpeg'], [WEBP, 'webp', 'image/webp']]) {
      const { estado, json } = await subir(tokenAdmin, contenido, `foto.${extension}`, tipo)
      assert.equal(estado, 201)
      assert.match(json.datos.url, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/[0-9a-f-]{36}\.webp$/)
      assert.equal(json.datos.tipo, 'image/webp')
      assert.deepEqual([json.datos.ancho, json.datos.alto], [1600, 800])

      const imagen = await fetch(json.datos.url)
      assert.equal(imagen.status, 200)
      assert.equal(imagen.headers.get('content-type'), 'image/webp')
      assert.equal(imagen.headers.get('cross-origin-resource-policy'), 'cross-origin')
      const metadatos = await sharp(Buffer.from(await imagen.arrayBuffer())).metadata()
      assert.equal(metadatos.format, 'webp')
      assert.equal(metadatos.exif, undefined, 'la imagen publicada no conserva metadatos EXIF')

      for (const ancho of [400, 800]) {
        const version = await fetch(json.datos.url.replace('.webp', `-${ancho}.webp`))
        assert.equal(version.status, 200)
        assert.equal((await sharp(Buffer.from(await version.arrayBuffer())).metadata()).width, ancho)
      }
    }
  })

  test('la URL devuelta sirve para crear un hotel', async () => {
    const { json } = await subir(tokenAdmin, PNG)
    const r = await fetch(`${base}/api/hoteles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ nombre: 'Hotel con foto', destinoId: 'kioto', ubicacion: 'Kioto', precioNoche: 100000, imagen: json.datos.url }),
    })
    assert.equal(r.status, 201)
    assert.equal((await r.json()).datos.imagenes[0], json.datos.url)
  })

  test('sin sesión o sin rol admin no se puede subir', async () => {
    assert.equal((await subir(null, PNG)).estado, 401)
    assert.equal((await subir(tokenCliente, PNG)).estado, 403)
  })

  test('rechaza archivos que no son imágenes aunque digan serlo', async () => {
    const texto = await subir(tokenAdmin, Buffer.from('esto es un texto cualquiera, no una imagen'), 'falsa.png', 'image/png')
    assert.equal(texto.estado, 400)
    const danada = await subir(tokenAdmin, Buffer.concat([PNG.subarray(0, 40), Buffer.alloc(200)]), 'danada.png', 'image/png')
    assert.equal(danada.estado, 400, 'firma de PNG correcta pero contenido dañado')
    const svg = await subir(tokenAdmin, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'x.svg', 'image/svg+xml')
    assert.equal(svg.estado, 400)
  })

  test('rechaza imágenes demasiado grandes, campos equivocados y peticiones sin archivo', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(1.5 * 1024 * 1024)])
    const r = await subir(tokenAdmin, grande)
    assert.equal(r.estado, 413)
    assert.match(r.json.error.mensaje, /1 MB/)

    assert.equal((await subir(tokenAdmin, PNG, 'foto.png', 'image/png', 'otro')).estado, 400)

    const sinArchivo = await fetch(`${base}/api/imagenes`, { method: 'POST', headers: { Authorization: `Bearer ${tokenAdmin}` } })
    assert.equal(sinArchivo.status, 400)
  })

  test('los archivos rechazados no se guardan en disco', () => {
    // 4 imágenes válidas × 3 tamaños cada una.
    const archivos = readdirSync(carpetaTemporal)
    assert.equal(archivos.length, 12, `solo las imágenes válidas, encontrados: ${archivos.join(', ')}`)
  })
})
