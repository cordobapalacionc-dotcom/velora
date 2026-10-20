import { Router } from 'express'
import multer from 'multer'
import { config } from '../../config/env.js'
import { autenticar, autorizar } from '../../middlewares/autenticacion.js'
import { imagenesServicio } from './imagenes.servicio.js'

// El archivo queda en memoria (máximo IMAGEN_MAX_MB) hasta validar su contenido;
// solo se escribe en disco si es una imagen real.
const recibirImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.imagenes.maxBytes, files: 1, fields: 0, parts: 1 },
}).single('imagen')

export const imagenesRutas = Router()

// La sesión y el rol se comprueban ANTES de recibir el archivo: un anónimo no puede ni empezar a subirlo.
imagenesRutas.post('/', autenticar, autorizar('admin'), recibirImagen, async (req, res) => {
  const imagen = await imagenesServicio.guardar(req.file)
  const base = config.imagenes.urlPublica ?? `${req.protocol}://${req.get('host')}`
  res.status(201).json({ datos: { ...imagen, url: `${base}/uploads/${imagen.nombre}` } })
})
