// Datos iniciales del catálogo. Cada elemento puede traer `en` con sus textos en inglés:
// sembrar.js los guarda en la columna `traducciones`.
function img(id, w = 1200, h = 800) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`
}

export const destinos = [
  { id: 'costa-amalfitana', nombre: 'Costa Amalfitana', pais: 'Italia', imagen: img('photo-1612698093158-e07ac200d44e', 500, 400), en: { nombre: 'Amalfi Coast', pais: 'Italy' } },
  { id: 'kioto', nombre: 'Kioto', pais: 'Japón', imagen: img('photo-1493976040374-85c8e12f0c0e', 500, 400), en: { nombre: 'Kyoto', pais: 'Japan' } },
  { id: 'santorini', nombre: 'Santorini', pais: 'Grecia', imagen: img('photo-1570077188670-e3a8d69ac5ff', 500, 400), en: { nombre: 'Santorini', pais: 'Greece' } },
  { id: 'cartagena', nombre: 'Cartagena de Indias', pais: 'Colombia', imagen: img('photo-1583531352515-8884af319dc1', 500, 400), en: { nombre: 'Cartagena', pais: 'Colombia' } },
  { id: 'st-moritz', nombre: 'St. Moritz', pais: 'Suiza', imagen: img('photo-1510798831971-661eb04b3739', 500, 400), en: { nombre: 'St. Moritz', pais: 'Switzerland' } },
  { id: 'eje-cafetero', nombre: 'Eje Cafetero', pais: 'Colombia', imagen: img('photo-1470240731273-7821a6eeb6bd', 500, 400), en: { nombre: 'Coffee Region', pais: 'Colombia' } },
]

export const colecciones = [
  { id: 'villas-mar', nombre: 'Villas junto al mar', imagen: img('photo-1571896349842-33c89424de2d', 500, 400), en: { nombre: 'Seaside villas' } },
  { id: 'retiros-boutique', nombre: 'Retiros boutique íntimos', imagen: img('photo-1590490360182-c33d57733427', 500, 400), en: { nombre: 'Intimate boutique retreats' } },
  { id: 'montana', nombre: 'Refugios de montaña', imagen: img('photo-1418985991508-e47386d96a71', 500, 400), en: { nombre: 'Mountain hideaways' } },
  { id: 'cafe-colombiano', nombre: 'Retiros en el Eje Cafetero', imagen: img('photo-1447933601403-0c6688de566e', 500, 400), en: { nombre: 'Coffee Region retreats' } },
]

// Temporadas de ejemplo. hotelId null = aplican a todos los hoteles.
export const temporadas = [
  { nombre: 'Temporada alta de fin de año', inicio: '2026-12-15', fin: '2027-01-15', recargo: 30, hotelId: null },
  { nombre: 'Temporada baja de febrero', inicio: '2027-02-01', fin: '2027-02-28', recargo: -10, hotelId: null },
  { nombre: 'Semana Santa', inicio: '2027-03-21', fin: '2027-03-27', recargo: 20, hotelId: null },
  { nombre: 'Vacaciones de mitad de año', inicio: '2027-06-15', fin: '2027-07-15', recargo: 15, hotelId: null },
  { nombre: 'Temporada alta de fin de año', inicio: '2027-12-15', fin: '2028-01-15', recargo: 30, hotelId: null },
  { nombre: 'Temporada de esquí', inicio: '2026-12-01', fin: '2027-03-31', recargo: 25, hotelId: 'st-moritz-crystal' },
]

export const hoteles = [
  {
    id: 'saffron-cliff-palace',
    nombre: 'Palacio Saffron del Acantilado',
    destinoId: 'costa-amalfitana',
    colecciones: ['villas-mar'],
    ubicacion: 'Costa Amalfitana, Italia',
    calificacion: 4.9,
    numResenas: 128,
    precioNoche: 3350000,
    descripcionCorta: 'Suspendido entre el cielo y el mar Tirreno, un santuario de calma absoluta.',
    descripcion:
      'Encaramado en los acantilados dorados de la Costa Amalfitana, el Palacio Saffron es un homenaje a la calma suspendida. Cada suite ha sido diseñada para difuminar el límite entre interior y exterior, con terrazas privadas que se asoman al Mediterráneo. El servicio es silencioso pero omnipresente: una filosofía de hospitalidad que rara vez se encuentra en la Costa Amalfitana y a la que siempre queremos volver cada verano.',
    imagenes: [
      img('photo-1612698093158-e07ac200d44e'),
      img('photo-1533105079780-92b9be482077', 600, 450),
      img('photo-1499678329028-101435549a4e', 600, 450),
      img('photo-1469796466635-455ede028aca', 600, 450),
    ],
    habitaciones: [
      {
        id: 'terraza-doble',
        nombre: 'Terraza Doble Deluxe',
        detalle: '35 m² · Cama King · Vista a la terraza',
        precio: 2680000,
        capacidad: 2,
        imagen: img('photo-1618773928121-c32242e63f39', 300, 220),
        en: { nombre: 'Deluxe Terrace Double', detalle: '35 m² · King bed · Terrace view' },
      },
      {
        id: 'suite-zafiro',
        nombre: 'Suite Zafiro Firmada',
        detalle: '60 m² · Suite completa · Vista panorámica al mar',
        precio: 5450000,
        capacidad: 4,
        imagen: img('photo-1578683010236-d716f9a3f461', 300, 220),
        destacado: true,
        en: { nombre: 'Signature Sapphire Suite', detalle: '60 m² · Full suite · Panoramic sea view' },
      },
      {
        id: 'villa-familiar-saffron',
        nombre: 'Villa Familiar del Acantilado',
        detalle: '95 m² · 3 habitaciones · Terraza privada',
        precio: 7980000,
        capacidad: 6,
        imagen: img('photo-1545083036-b175dd155a1d', 300, 220),
        en: { nombre: 'Clifftop Family Villa', detalle: '95 m² · 3 bedrooms · Private terrace' },
      },
    ],
    reputacion: { promedio: 4.9, total: 128, limpieza: 99, ubicacion: 98, cobertura: 96, respuesta: 95 },
    testimonio: {
      texto:
        'La máxima expresión de la hospitalidad. Velora no se limitó a reservarnos una suite, diseñó un retiro de silencio total en la Costa Amalfitana al que volvemos cada verano.',
      autor: 'Huésped Velora',
      detalle: 'Huésped verificado · 4 estadías',
    },
    en: {
      descripcionCorta: 'Suspended between the sky and the Tyrrhenian Sea, a sanctuary of absolute calm.',
      descripcion:
        'Perched on the golden cliffs of the Amalfi Coast, Palacio Saffron is a tribute to suspended calm. Every suite is designed to blur the line between inside and out, with private terraces overlooking the Mediterranean. The service is quiet yet ever-present: a philosophy of hospitality rarely found on the Amalfi Coast, and one we long to return to every summer.',
      testimonio: {
        texto:
          'Hospitality at its finest. Velora did not just book us a suite; it designed a retreat of complete silence on the Amalfi Coast that we return to every summer.',
        autor: 'Velora guest',
        detalle: 'Verified guest · 4 stays',
      },
    },
  },
  {
    id: 'belvedere-sands',
    nombre: 'Refugio de Arenas Belvedere',
    destinoId: 'costa-amalfitana',
    colecciones: ['villas-mar', 'retiros-boutique'],
    ubicacion: 'Costa Amalfitana, Italia',
    calificacion: 4.8,
    numResenas: 94,
    precioNoche: 2290000,
    descripcionCorta: 'Un refugio íntimo entre pinos y arena blanca frente al Tirreno.',
    descripcion:
      'El Refugio de Arenas Belvedere combina la sobriedad del diseño mediterráneo con vistas ininterrumpidas al mar. Un enclave pensado para quienes buscan lujo silencioso, sin ostentación.',
    imagenes: [
      img('photo-1516483638261-f4dbaf036963'),
      img('photo-1571896349842-33c89424de2d', 600, 450),
      img('photo-1445019980597-93fa8acb246c', 600, 450),
    ],
    habitaciones: [
      { id: 'vista-jardin', nombre: 'Habitación Vista Jardín', detalle: '28 m² · Cama Queen', precio: 2290000, capacidad: 2, imagen: img('photo-1505693416388-ac5ce068fe85', 300, 220), en: { nombre: 'Garden View Room', detalle: '28 m² · Queen bed' } },
      { id: 'suite-mar', nombre: 'Suite Vista al Mar', precio: 3980000, detalle: '48 m² · Terraza privada', capacidad: 4, imagen: img('photo-1582719478250-c89cae4dc85b', 300, 220), destacado: true, en: { nombre: 'Sea View Suite', detalle: '48 m² · Private terrace' } },
      { id: 'casa-playa-belvedere', nombre: 'Casa de Playa Belvedere', detalle: '90 m² · 3 habitaciones · Acceso directo a la arena', precio: 6480000, capacidad: 6, imagen: img('photo-1600585154340-be6161a56a0c', 300, 220), en: { nombre: 'Belvedere Beach House', detalle: '90 m² · 3 bedrooms · Direct beach access' } },
    ],
    reputacion: { promedio: 4.8, total: 94, limpieza: 97, ubicacion: 99, cobertura: 94, respuesta: 92 },
    en: {
      descripcionCorta: 'An intimate hideaway among pines and white sand facing the Tyrrhenian Sea.',
      descripcion:
        'Belvedere Sands pairs the restraint of Mediterranean design with uninterrupted sea views. A retreat for those who seek quiet luxury, without ostentation.',
    },
  },
  {
    id: 'azure-vault-cloister',
    nombre: 'Claustro Azur de Saffron',
    destinoId: 'santorini',
    colecciones: ['villas-mar'],
    ubicacion: 'Santorini, Grecia',
    calificacion: 4.9,
    numResenas: 156,
    precioNoche: 3690000,
    descripcionCorta: 'Cúpulas blancas y piscinas de borde infinito sobre la caldera volcánica.',
    descripcion:
      'Tallado en la ladera de la caldera de Santorini, el Claustro Azur reinterpreta la arquitectura cicládica con un lenguaje minimalista. Cada suite tiene su propia piscina privada frente al atardecer más fotografiado del Egeo.',
    imagenes: [
      img('photo-1570077188670-e3a8d69ac5ff'),
      img('photo-1613395877344-13d4a8e0d49e', 600, 450),
      img('photo-1613490493576-7fde63acd811', 600, 450),
    ],
    habitaciones: [
      { id: 'suite-caldera', nombre: 'Suite Caldera', detalle: '32 m² · Piscina privada', precio: 3690000, capacidad: 2, imagen: img('photo-1631049307264-da0ec9d70304', 300, 220), en: { nombre: 'Caldera Suite', detalle: '32 m² · Private pool' } },
      { id: 'villa-egeo', nombre: 'Villa del Egeo', detalle: '75 m² · 2 habitaciones', precio: 6980000, capacidad: 4, imagen: img('photo-1613490493576-7fde63acd811', 300, 220), destacado: true, en: { nombre: 'Aegean Villa', detalle: '75 m² · 2 bedrooms' } },
      { id: 'mansion-caldera', nombre: 'Mansión de la Caldera', detalle: '110 m² · 3 habitaciones · Piscina infinita privada', precio: 9800000, capacidad: 6, imagen: img('photo-1530841377377-3ff06c0ca713', 300, 220), en: { nombre: 'Caldera Mansion', detalle: '110 m² · 3 bedrooms · Private infinity pool' } },
    ],
    reputacion: { promedio: 4.9, total: 156, limpieza: 98, ubicacion: 100, cobertura: 95, respuesta: 96 },
    en: {
      descripcionCorta: 'White domes and infinity pools above the volcanic caldera.',
      descripcion:
        'Carved into the slope of the Santorini caldera, the Azure Cloister reinterprets Cycladic architecture in a minimalist language. Every suite has its own private pool facing the most photographed sunset in the Aegean.',
    },
  },
  {
    id: 'saffron-tea-garden',
    nombre: 'Jardín de Té de Saffron',
    destinoId: 'kioto',
    colecciones: ['retiros-boutique'],
    ubicacion: 'Kioto, Japón',
    calificacion: 4.7,
    numResenas: 76,
    precioNoche: 1450000,
    descripcionCorta: 'Un ryokan contemporáneo entre jardines de arce y bosques de bambú.',
    descripcion:
      'A pasos de los templos históricos de Kioto, este ryokan reinterpretado combina la ceremonia del té, los onsen privados y una arquitectura de madera de ciprés que envejece con dignidad.',
    imagenes: [
      img('photo-1493976040374-85c8e12f0c0e'),
      img('photo-1478436127897-769e1b3f0f36', 600, 450),
      img('photo-1545569341-9eb8b30979d9', 600, 450),
    ],
    habitaciones: [
      { id: 'tatami-clasica', nombre: 'Habitación Tatami Clásica', detalle: '24 m² · Futón tradicional', precio: 1450000, capacidad: 2, imagen: img('photo-1540518614846-7eded433c457', 300, 220), en: { nombre: 'Classic Tatami Room', detalle: '24 m² · Traditional futon' } },
      { id: 'suite-onsen', nombre: 'Suite con Onsen Privado', detalle: '40 m² · Baño termal propio', precio: 2680000, capacidad: 4, imagen: img('photo-1590490360182-c33d57733427', 300, 220), destacado: true, en: { nombre: 'Private Onsen Suite', detalle: '40 m² · Private thermal bath' } },
      { id: 'pabellon-familiar', nombre: 'Pabellón Familiar de Té', detalle: '70 m² · 2 habitaciones tatami · Jardín privado', precio: 4350000, capacidad: 6, imagen: img('photo-1522771739844-6a9f6d5f14af', 300, 220), en: { nombre: 'Family Tea Pavilion', detalle: '70 m² · 2 tatami bedrooms · Private garden' } },
    ],
    reputacion: { promedio: 4.7, total: 76, limpieza: 99, ubicacion: 93, cobertura: 90, respuesta: 94 },
    en: {
      descripcionCorta: 'A contemporary ryokan among maple gardens and bamboo groves.',
      descripcion:
        'Steps from the historic temples of Kyoto, this reimagined ryokan brings together the tea ceremony, private onsen and cypress-wood architecture that ages with grace.',
    },
  },
  {
    id: 'st-moritz-crystal',
    nombre: 'Chalet de Cristal St. Moritz',
    destinoId: 'st-moritz',
    colecciones: ['montana'],
    ubicacion: 'St. Moritz, Suiza',
    calificacion: 4.9,
    numResenas: 112,
    precioNoche: 4150000,
    descripcionCorta: 'Lujo alpino frente al lago, con spa de altura y chimeneas de piedra.',
    descripcion:
      'Entre picos nevados y el lago helado de St. Moritz, este chalet combina la calidez de la madera antigua con un spa de última generación. Ideal para quienes buscan silencio absoluto en altura.',
    imagenes: [
      img('photo-1510798831971-661eb04b3739'),
      img('photo-1476514525535-07fb3b4ae5f1', 600, 450),
      img('photo-1520984032042-162d526883e0', 600, 450),
    ],
    habitaciones: [
      { id: 'habitacion-alpina', nombre: 'Habitación Alpina', detalle: '30 m² · Vista al lago', precio: 4150000, capacidad: 2, imagen: img('photo-1631049307264-da0ec9d70304', 300, 220), en: { nombre: 'Alpine Room', detalle: '30 m² · Lake view' } },
      { id: 'suite-chimenea', nombre: 'Suite con Chimenea', detalle: '55 m² · Balcón y jacuzzi', precio: 7290000, capacidad: 4, imagen: img('photo-1618773928121-c32242e63f39', 300, 220), destacado: true, en: { nombre: 'Fireplace Suite', detalle: '55 m² · Balcony and hot tub' } },
      { id: 'chalet-familiar-moritz', nombre: 'Chalet Familiar de Altura', detalle: '120 m² · 3 habitaciones · Sala con chimenea', precio: 11800000, capacidad: 6, imagen: img('photo-1545083036-b175dd155a1d', 300, 220), en: { nombre: 'Alpine Family Chalet', detalle: '120 m² · 3 bedrooms · Living room with fireplace' } },
    ],
    reputacion: { promedio: 4.9, total: 112, limpieza: 98, ubicacion: 97, cobertura: 96, respuesta: 97 },
    en: {
      descripcionCorta: 'Alpine luxury by the lake, with a high-altitude spa and stone fireplaces.',
      descripcion:
        'Between snowy peaks and the frozen lake of St. Moritz, this chalet blends the warmth of old timber with a state-of-the-art spa. Ideal for those seeking complete silence at altitude.',
    },
  },
  {
    id: 'refugio-colonial-cartagena',
    nombre: 'Refugio Colonial de Cartagena',
    destinoId: 'cartagena',
    colecciones: ['retiros-boutique'],
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
      { id: 'habitacion-colonial', nombre: 'Habitación Colonial', detalle: '26 m² · Balcón interior', precio: 1190000, capacidad: 2, imagen: img('photo-1505693416388-ac5ce068fe85', 300, 220), en: { nombre: 'Colonial Room', detalle: '26 m² · Inner balcony' } },
      { id: 'suite-azotea', nombre: 'Suite de la Azotea', detalle: '42 m² · Acceso directo a la piscina', precio: 2050000, capacidad: 4, imagen: img('photo-1544984243-ec57ea16fe25', 300, 220), destacado: true, en: { nombre: 'Rooftop Suite', detalle: '42 m² · Direct pool access' } },
      { id: 'casa-colonial-completa', nombre: 'Casa Colonial Completa', detalle: '80 m² · 3 habitaciones · Patio y piscina privados', precio: 3680000, capacidad: 6, imagen: img('photo-1583531352515-8884af319dc1', 300, 220), en: { nombre: 'Entire Colonial House', detalle: '80 m² · 3 bedrooms · Private patio and pool' } },
    ],
    reputacion: { promedio: 4.6, total: 203, limpieza: 95, ubicacion: 99, cobertura: 91, respuesta: 93 },
    en: {
      ubicacion: 'Walled City, Cartagena, Colombia',
      descripcionCorta: 'A restored colonial mansion by the city walls, with a courtyard and rooftop pool.',
      descripcion:
        'In the heart of the Walled City, this hideaway occupies a lovingly restored 17th-century colonial house. High ceilings, carved wooden balconies and a rooftop pool overlooking the tiled roofs of Cartagena.',
    },
  },
  {
    id: 'mirador-del-cafe',
    nombre: 'Mirador del Café',
    destinoId: 'eje-cafetero',
    colecciones: ['cafe-colombiano', 'montana'],
    ubicacion: 'Salento, Eje Cafetero, Colombia',
    calificacion: 4.8,
    numResenas: 141,
    precioNoche: 890000,
    descripcionCorta: 'Cabañas de finca cafetera entre palmas de cera y montañas verdes.',
    descripcion:
      'Rodeado de cafetales y palmas de cera del Valle de Cocora, el Mirador del Café ofrece cabañas privadas con hidromasaje exterior, catas de café de origen y senderos guiados por la finca.',
    imagenes: [
      img('photo-1470240731273-7821a6eeb6bd'),
      img('photo-1542718610-a1d656d1884c', 600, 450),
      img('photo-1449158743715-0a90ebb6d2d8', 600, 450),
    ],
    habitaciones: [
      { id: 'cabana-finca', nombre: 'Cabaña de Finca', detalle: '30 m² · Terraza con hidromasaje', precio: 890000, capacidad: 2, imagen: img('photo-1449158743715-0a90ebb6d2d8', 300, 220), en: { nombre: 'Farm Cabin', detalle: '30 m² · Terrace with hot tub' } },
      { id: 'suite-valle', nombre: 'Suite Valle de Cocora', detalle: '45 m² · Vista panorámica', precio: 1450000, capacidad: 4, imagen: img('photo-1582719478250-c89cae4dc85b', 300, 220), destacado: true, en: { nombre: 'Cocora Valley Suite', detalle: '45 m² · Panoramic view' } },
      { id: 'cabana-familiar-cafe', nombre: 'Cabaña Familiar del Valle', detalle: '65 m² · 3 habitaciones · Terraza panorámica', precio: 2450000, capacidad: 6, imagen: img('photo-1542718610-a1d656d1884c', 300, 220), en: { nombre: 'Valley Family Cabin', detalle: '65 m² · 3 bedrooms · Panoramic terrace' } },
    ],
    reputacion: { promedio: 4.8, total: 141, limpieza: 97, ubicacion: 96, cobertura: 90, respuesta: 92 },
    en: {
      ubicacion: 'Salento, Coffee Region, Colombia',
      descripcionCorta: 'Coffee-farm cabins among wax palms and green mountains.',
      descripcion:
        'Surrounded by coffee fields and the wax palms of the Cocora Valley, Mirador del Café offers private cabins with outdoor hot tubs, single-origin coffee tastings and guided trails across the farm.',
    },
  },
]
