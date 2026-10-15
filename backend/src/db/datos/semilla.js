// Datos iniciales del catálogo (copiados del frontend Velora/src/pages/data/hotels.js).
// Se agregan los destinos st-moritz y eje-cafetero porque hay hoteles que los referencian.
function img(id, w = 1200, h = 800) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`
}

export const heroImagen = img('photo-1533104816931-20fa691ff6ca', 1600, 900)

export const destinos = [
  { id: 'costa-amalfitana', nombre: 'Costa Amalfitana', pais: 'Italia', imagen: img('photo-1533104816931-20fa691ff6ca', 500, 400) },
  { id: 'kioto', nombre: 'Kioto', pais: 'Japón', imagen: img('photo-1493976040374-85c8e12f0c0e', 500, 400) },
  { id: 'santorini', nombre: 'Santorini', pais: 'Grecia', imagen: img('photo-1570077188670-e3a8d69ac5ff', 500, 400) },
  { id: 'cartagena', nombre: 'Cartagena de Indias', pais: 'Colombia', imagen: img('photo-1583531352515-8884af319dc1', 500, 400) },
  { id: 'st-moritz', nombre: 'St. Moritz', pais: 'Suiza', imagen: img('photo-1476514525535-07fb3b4ae5f1', 500, 400) },
  { id: 'eje-cafetero', nombre: 'Eje Cafetero', pais: 'Colombia', imagen: img('photo-1447933601403-0c6688de566e', 500, 400) },
]

export const colecciones = [
  { id: 'villas-mar', nombre: 'Villas junto al mar', imagen: img('photo-1571896349842-33c89424de2d', 500, 400) },
  { id: 'retiros-boutique', nombre: 'Retiros boutique íntimos', imagen: img('photo-1520250497591-112f2f40a3f4', 500, 400) },
  { id: 'skylines', nombre: 'Skylines metropolitanos', imagen: img('photo-1518391846015-55a9cc003b25', 500, 400) },
  { id: 'cafe-colombiano', nombre: 'Retiros en el Eje Cafetero', imagen: img('photo-1447933601403-0c6688de566e', 500, 400) },
]

export const hoteles = [
  {
    id: 'saffron-cliff-palace',
    nombre: 'Palacio Saffron del Acantilado',
    destinoId: 'costa-amalfitana',
    ubicacion: 'Costa Amalfitana, Italia',
    calificacion: 4.9,
    numResenas: 128,
    precioNoche: 3350000,
    descripcionCorta: 'Suspendido entre el cielo y el mar Tirreno, un santuario de calma absoluta.',
    descripcion:
      'Encaramado en los acantilados dorados de la Costa Amalfitana, el Palacio Saffron es un homenaje a la calma suspendida. Cada suite ha sido diseñada para difuminar el límite entre interior y exterior, con terrazas privadas que se asoman al Mediterráneo. El servicio es silencioso pero omnipresente: una filosofía de hospitalidad que rara vez se encuentra en la Costa Amalfitana y a la que siempre queremos volver cada verano.',
    imagenes: [
      img('photo-1533104816931-20fa691ff6ca'),
      img('photo-1520250497591-112f2f40a3f4', 600, 450),
      img('photo-1571003123894-1f0594d2b5d9', 600, 450),
      img('photo-1445019980597-93fa8acb246c', 600, 450),
    ],
    habitaciones: [
      {
        id: 'terraza-doble',
        nombre: 'Terraza Doble Deluxe',
        detalle: '35 m² · Cama King · Vista a la terraza',
        precio: 2680000,
        capacidad: 2,
        imagen: img('photo-1566073771259-6a8506099945', 300, 220),
      },
      {
        id: 'suite-zafiro',
        nombre: 'Suite Zafiro Firmada',
        detalle: '60 m² · Suite completa · Vista panorámica al mar',
        precio: 5450000,
        capacidad: 4,
        imagen: img('photo-1611892440504-42a792e24d32', 300, 220),
        destacado: true,
      },
      {
        id: 'villa-familiar-saffron',
        nombre: 'Villa Familiar del Acantilado',
        detalle: '95 m² · 3 habitaciones · Terraza privada',
        precio: 7980000,
        capacidad: 6,
        imagen: img('photo-1571003123894-1f0594d2b5d9', 300, 220),
      },
    ],
    reputacion: { promedio: 4.9, total: 128, limpieza: 99, ubicacion: 98, cobertura: 96, respuesta: 95 },
    testimonio: {
      texto:
        'La máxima expresión de la hospitalidad. Velora no se limitó a reservarnos una suite, diseñó un retiro de silencio total en la Costa Amalfitana al que volvemos cada verano.',
      autor: 'Huésped Velora',
      detalle: 'Huésped verificado · 4 estadías',
    },
  },
  {
    id: 'belvedere-sands',
    nombre: 'Refugio de Arenas Belvedere',
    destinoId: 'costa-amalfitana',
    ubicacion: 'Costa Amalfitana, Italia',
    calificacion: 4.8,
    numResenas: 94,
    precioNoche: 2290000,
    descripcionCorta: 'Un refugio íntimo entre pinos y arena blanca frente al Tirreno.',
    descripcion:
      'El Refugio de Arenas Belvedere combina la sobriedad del diseño mediterráneo con vistas ininterrumpidas al mar. Un enclave pensado para quienes buscan lujo silencioso, sin ostentación.',
    imagenes: [
      img('photo-1571896349842-33c89424de2d'),
      img('photo-1445019980597-93fa8acb246c', 600, 450),
      img('photo-1520250497591-112f2f40a3f4', 600, 450),
    ],
    habitaciones: [
      { id: 'vista-jardin', nombre: 'Habitación Vista Jardín', detalle: '28 m² · Cama Queen', precio: 2290000, capacidad: 2, imagen: img('photo-1566073771259-6a8506099945', 300, 220) },
      { id: 'suite-mar', nombre: 'Suite Vista al Mar', precio: 3980000, detalle: '48 m² · Terraza privada', capacidad: 4, imagen: img('photo-1611892440504-42a792e24d32', 300, 220), destacado: true },
      { id: 'casa-playa-belvedere', nombre: 'Casa de Playa Belvedere', detalle: '90 m² · 3 habitaciones · Acceso directo a la arena', precio: 6480000, capacidad: 6, imagen: img('photo-1571896349842-33c89424de2d', 300, 220) },
    ],
    reputacion: { promedio: 4.8, total: 94, limpieza: 97, ubicacion: 99, cobertura: 94, respuesta: 92 },
  },
  {
    id: 'azure-vault-cloister',
    nombre: 'Claustro Azur de Saffron',
    destinoId: 'santorini',
    ubicacion: 'Santorini, Grecia',
    calificacion: 4.9,
    numResenas: 156,
    precioNoche: 3690000,
    descripcionCorta: 'Cúpulas blancas y piscinas de borde infinito sobre la caldera volcánica.',
    descripcion:
      'Tallado en la ladera de la caldera de Santorini, el Claustro Azur reinterpreta la arquitectura cicládica con un lenguaje minimalista. Cada suite tiene su propia piscina privada frente al atardecer más fotografiado del Egeo.',
    imagenes: [
      img('photo-1570077188670-e3a8d69ac5ff'),
      img('photo-1613490493576-7fde63acd811', 600, 450),
      img('photo-1526481280693-3bfa7568e0f3', 600, 450),
    ],
    habitaciones: [
      { id: 'suite-caldera', nombre: 'Suite Caldera', detalle: '32 m² · Piscina privada', precio: 3690000, capacidad: 2, imagen: img('photo-1566073771259-6a8506099945', 300, 220) },
      { id: 'villa-egeo', nombre: 'Villa del Egeo', detalle: '75 m² · 2 habitaciones', precio: 6980000, capacidad: 4, imagen: img('photo-1611892440504-42a792e24d32', 300, 220), destacado: true },
      { id: 'mansion-caldera', nombre: 'Mansión de la Caldera', detalle: '110 m² · 3 habitaciones · Piscina infinita privada', precio: 9800000, capacidad: 6, imagen: img('photo-1570077188670-e3a8d69ac5ff', 300, 220) },
    ],
    reputacion: { promedio: 4.9, total: 156, limpieza: 98, ubicacion: 100, cobertura: 95, respuesta: 96 },
  },
  {
    id: 'saffron-tea-garden',
    nombre: 'Jardín de Té de Saffron',
    destinoId: 'kioto',
    ubicacion: 'Kioto, Japón',
    calificacion: 4.7,
    numResenas: 76,
    precioNoche: 1450000,
    descripcionCorta: 'Un ryokan contemporáneo entre jardines de arce y bosques de bambú.',
    descripcion:
      'A pasos de los templos históricos de Kioto, este ryokan reinterpretado combina la ceremonia del té, los onsen privados y una arquitectura de madera de ciprés que envejece con dignidad.',
    imagenes: [
      img('photo-1493976040374-85c8e12f0c0e'),
      img('photo-1590490360182-c33d57733427', 600, 450),
      img('photo-1503899036084-c55cdd92da26', 600, 450),
    ],
    habitaciones: [
      { id: 'tatami-clasica', nombre: 'Habitación Tatami Clásica', detalle: '24 m² · Futón tradicional', precio: 1450000, capacidad: 2, imagen: img('photo-1566073771259-6a8506099945', 300, 220) },
      { id: 'suite-onsen', nombre: 'Suite con Onsen Privado', detalle: '40 m² · Baño termal propio', precio: 2680000, capacidad: 4, imagen: img('photo-1611892440504-42a792e24d32', 300, 220), destacado: true },
      { id: 'pabellon-familiar', nombre: 'Pabellón Familiar de Té', detalle: '70 m² · 2 habitaciones tatami · Jardín privado', precio: 4350000, capacidad: 6, imagen: img('photo-1493976040374-85c8e12f0c0e', 300, 220) },
    ],
    reputacion: { promedio: 4.7, total: 76, limpieza: 99, ubicacion: 93, cobertura: 90, respuesta: 94 },
  },
  {
    id: 'st-moritz-crystal',
    nombre: 'Chalet de Cristal St. Moritz',
    destinoId: 'st-moritz',
    ubicacion: 'St. Moritz, Suiza',
    calificacion: 4.9,
    numResenas: 112,
    precioNoche: 4150000,
    descripcionCorta: 'Lujo alpino frente al lago, con spa de altura y chimeneas de piedra.',
    descripcion:
      'Entre picos nevados y el lago helado de St. Moritz, este chalet combina la calidez de la madera antigua con un spa de última generación. Ideal para quienes buscan silencio absoluto en altura.',
    imagenes: [
      img('photo-1476514525535-07fb3b4ae5f1'),
      img('photo-1520250497591-112f2f40a3f4', 600, 450),
      img('photo-1445019980597-93fa8acb246c', 600, 450),
    ],
    habitaciones: [
      { id: 'habitacion-alpina', nombre: 'Habitación Alpina', detalle: '30 m² · Vista al lago', precio: 4150000, capacidad: 2, imagen: img('photo-1566073771259-6a8506099945', 300, 220) },
      { id: 'suite-chimenea', nombre: 'Suite con Chimenea', detalle: '55 m² · Balcón y jacuzzi', precio: 7290000, capacidad: 4, imagen: img('photo-1611892440504-42a792e24d32', 300, 220), destacado: true },
      { id: 'chalet-familiar-moritz', nombre: 'Chalet Familiar de Altura', detalle: '120 m² · 3 habitaciones · Sala con chimenea', precio: 11800000, capacidad: 6, imagen: img('photo-1476514525535-07fb3b4ae5f1', 300, 220) },
    ],
    reputacion: { promedio: 4.9, total: 112, limpieza: 98, ubicacion: 97, cobertura: 96, respuesta: 97 },
  },
  {
    id: 'refugio-colonial-cartagena',
    nombre: 'Refugio Colonial de Cartagena',
    destinoId: 'cartagena',
    ubicacion: 'Ciudad Amurallada, Cartagena, Colombia',
    calificacion: 4.6,
    numResenas: 203,
    precioNoche: 1190000,
    descripcionCorta: 'Una mansión colonial restaurada frente a las murallas, con patio y piscina en el techo.',
    descripcion:
      'En el corazón de la Ciudad Amurallada, este refugio ocupa una casona colonial del siglo XVII restaurada con mimo. Techos altos, balcones de madera tallada y una piscina en la azotea con vista a los tejados de Cartagena.',
    imagenes: [
      img('photo-1583531352515-8884af319dc1'),
      img('photo-1544984243-ec57ea16fe25', 600, 450),
      img('photo-1571896349842-33c89424de2d', 600, 450),
    ],
    habitaciones: [
      { id: 'habitacion-colonial', nombre: 'Habitación Colonial', detalle: '26 m² · Balcón interior', precio: 1190000, capacidad: 2, imagen: img('photo-1566073771259-6a8506099945', 300, 220) },
      { id: 'suite-azotea', nombre: 'Suite de la Azotea', detalle: '42 m² · Acceso directo a la piscina', precio: 2050000, capacidad: 4, imagen: img('photo-1611892440504-42a792e24d32', 300, 220), destacado: true },
      { id: 'casa-colonial-completa', nombre: 'Casa Colonial Completa', detalle: '80 m² · 3 habitaciones · Patio y piscina privados', precio: 3680000, capacidad: 6, imagen: img('photo-1583531352515-8884af319dc1', 300, 220) },
    ],
    reputacion: { promedio: 4.6, total: 203, limpieza: 95, ubicacion: 99, cobertura: 91, respuesta: 93 },
  },
  {
    id: 'mirador-del-cafe',
    nombre: 'Mirador del Café',
    destinoId: 'eje-cafetero',
    ubicacion: 'Salento, Eje Cafetero, Colombia',
    calificacion: 4.8,
    numResenas: 141,
    precioNoche: 890000,
    descripcionCorta: 'Cabañas de finca cafetera entre palmas de cera y montañas verdes.',
    descripcion:
      'Rodeado de cafetales y palmas de cera del Valle de Cocora, el Mirador del Café ofrece cabañas privadas con hidromasaje exterior, catas de café de origen y senderos guiados por la finca.',
    imagenes: [
      img('photo-1447933601403-0c6688de566e'),
      img('photo-1470240731273-7821a6eeb6bd', 600, 450),
      img('photo-1445019980597-93fa8acb246c', 600, 450),
    ],
    habitaciones: [
      { id: 'cabana-finca', nombre: 'Cabaña de Finca', detalle: '30 m² · Terraza con hidromasaje', precio: 890000, capacidad: 2, imagen: img('photo-1566073771259-6a8506099945', 300, 220) },
      { id: 'suite-valle', nombre: 'Suite Valle de Cocora', detalle: '45 m² · Vista panorámica', precio: 1450000, capacidad: 4, imagen: img('photo-1611892440504-42a792e24d32', 300, 220), destacado: true },
      { id: 'cabana-familiar-cafe', nombre: 'Cabaña Familiar del Valle', detalle: '65 m² · 3 habitaciones · Terraza panorámica', precio: 2450000, capacidad: 6, imagen: img('photo-1447933601403-0c6688de566e', 300, 220) },
    ],
    reputacion: { promedio: 4.8, total: 141, limpieza: 97, ubicacion: 96, cobertura: 90, respuesta: 92 },
  },
]

