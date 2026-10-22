# Velora — Backend

API REST para el sitio de reservas de hoteles **Velora** (frontend en `../Velora`).
Es la única fuente de datos del sitio: hoteles, reservas, usuarios, reseñas y temporadas viven aquí,
con autenticación real y reglas de negocio que el navegador no puede saltarse.

**Stack:** Node.js ≥ 22.13 · Express 5 · SQLite (`node:sqlite`) · Zod · JWT · bcrypt · sharp (imágenes) · nodemailer (correo)

## Puesta en marcha

```bash
cd backend
npm install
cp .env.example .env      # ajusta los valores si lo necesitas
npm run dev               # http://localhost:4000/api  (se recarga al guardar)
```

| Script             | Qué hace                                                      |
| ------------------ | ------------------------------------------------------------- |
| `npm run dev`      | Servidor con recarga automática                               |
| `npm start`        | Servidor en modo normal                                       |
| `npm test`         | Pruebas de integración (BD en memoria, no toca tus datos)     |
| `npm run db:reset` | Borra `data/velora.db` y la recrea con los datos semilla      |

La base de datos se crea y se llena sola la primera vez (hoteles, colecciones, textos en inglés y temporadas de ejemplo).
Si cambias una tabla existente en `esquema.sql`, sube `VERSION_ESQUEMA` en `db/conexion.js`: el servidor
no arranca con una base vieja y pide ejecutar `npm run db:reset`.

**Cuentas demo** (solo fuera de producción):

| Rol           | Correo                 | Contraseña     |
| ------------- | ---------------------- | -------------- |
| admin         | admin@velora.com       | admin123       |
| recepcionista | recepcion@velora.com   | recepcion123   |

### Correos

Sin `SMTP_HOST` (desarrollo), cada correo se guarda como archivo `.html` en `data/correos/` y su ruta se
muestra en la consola; ábrelo en el navegador para verlo. En desarrollo, `POST /auth/recuperar` además devuelve
el enlace en `enlaceDesarrollo` para poder probar sin servidor de correo (nunca en producción ni con SMTP).
Para enviar correos de verdad, define `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` y `CORREO_REMITENTE`.

Se envía un correo al confirmar, modificar (por el hotel) o cancelar una reserva, al pedir un enlace para
restablecer la contraseña y cuando la contraseña cambia.

## Estructura

```
backend/
├── src/
│   ├── server.js              # Arranque, purga diaria de accesos viejos y apagado ordenado
│   ├── app.js                 # Express: seguridad, CORS, rutas, errores
│   ├── config/env.js          # Variables de entorno validadas (falla al arrancar si son inválidas)
│   ├── db/
│   │   ├── esquema.sql        # Tablas con CHECK, UNIQUE, FOREIGN KEY y triggers
│   │   ├── conexion.js        # Conexión SQLite, versión del esquema y transacciones
│   │   ├── sembrar.js         # Datos iniciales
│   │   └── datos/semilla.js   # Catálogo con textos en inglés y temporadas
│   ├── middlewares/           # autenticación, validación Zod, errores
│   ├── modules/
│   │   ├── auth/              # registro, login, bloqueo, restablecer contraseña
│   │   ├── admin/             # accesos y métricas de ocupación e ingresos
│   │   ├── catalogo/          # destinos, colecciones, configuración pública
│   │   ├── correo/            # envío de correos (SMTP o archivos en desarrollo)
│   │   ├── hoteles/           # hoteles, habitaciones, calendario y cotización
│   │   ├── imagenes/          # subida y optimización (WebP en 3 tamaños)
│   │   ├── resenas/           # reseñas verificadas
│   │   ├── reservas/          # reservas, modificaciones, cancelación, exportación CSV
│   │   └── tarifas/           # temporadas y fórmula de precios
│   └── utils/
└── tests/                     # api, concurrencia, imágenes, admin y funciones
```

Cada módulo sigue las mismas capas, y cada capa solo habla con la siguiente:

```
rutas  →  esquemas (validación)  →  servicio (reglas de negocio)  →  repositorio (SQL)
```

## Reglas que el backend garantiza

- **Contraseñas** con hash bcrypt (nunca en texto plano). El registro público solo crea `cliente`.
- **El precio lo calcula el servidor, noche por noche**: cada noche cuesta el precio base de la habitación
  ajustado por su temporada (si dos temporadas coinciden, manda la de mayor recargo); luego IVA 19 % y
  limpieza $180.000. Si el cliente envía `total`, `subtotal` u otro campo extra, la solicitud se rechaza.
- **Sin dobles reservas**: una habitación no puede tener dos reservas activas que se crucen
  (salir y entrar el mismo día sí está permitido). Ver [Reservas simultáneas](#reservas-simultáneas).
- **Fechas**: llegada no anterior a hoy, máximo 365 días de anticipación y 30 noches.
- **Capacidad**: los huéspedes no pueden superar la capacidad de la habitación.
- **Máquina de estados**: `confirmada → check-in → check-out` y `confirmada → cancelada`.
- **Política de cancelación**: gratis hasta `CANCELACION_GRATIS_DIAS` días antes de la llegada (por defecto 2 = 48 h).
  Después se cobra una noche (el promedio por noche de la estadía, con IVA) y queda guardado en `cargoCancelacion`.
  Solo el personal puede exonerar ese cargo.
- **Reseñas verificadas**: solo el huésped de la reserva, después del check-out, una por reserva.
  Un trigger de la base de datos lo vuelve a comprobar. En público se muestra "Nombre I." sin correo.
- **Bloqueo de cuentas**: tras `BLOQUEO_INTENTOS` (5) inicios de sesión fallidos de un correo, se bloquea
  `BLOQUEO_MINUTOS` (15). Durante el bloqueo ni la contraseña correcta entra. Se cuenta por correo, exista o no,
  para no revelar qué cuentas existen. Entrar bien o restablecer la contraseña reinicia el contador.
- **Restablecer contraseña**: enlace de un solo uso, válido 30 minutos; solo se guarda su hash SHA-256.
  Pedir uno nuevo invalida el anterior. Al cambiar la contraseña se cierran todas las sesiones (cada token
  lleva una versión de sesión que se compara en cada petición).
- **Datos personales**: los registros de acceso (IP y navegador) se borran solos a los `ACCESOS_RETENCION_DIAS` (90) días.
- **Privacidad**: un cliente solo ve y cancela sus reservas. Una reserva ajena responde 404, no 403.
  El calendario público solo expone fechas ocupadas, nunca datos del huésped.
- **La base de datos repite estas reglas** con `CHECK` y triggers, así que ni un error de programación puede
  guardar datos incoherentes.
- **Seguridad HTTP**: Helmet, CORS con lista blanca, límite de 100 kB por cuerpo y límite de intentos por IP
  en login, registro y recuperación (30 cada 15 min en producción).

## Reservas simultáneas

Dos estadías `[entrada, salida)` se cruzan cuando `a.entrada < b.salida AND a.salida > b.entrada`.
Solo cuentan las reservas activas (`confirmada` o `check-in`). Para que dos personas que reservan
la misma habitación en el mismo instante no puedan quedarse ambas con ella, hay tres capas:

1. **Transacción `BEGIN IMMEDIATE`** (`reservasServicio.crear` y `modificar`). Toma el bloqueo de escritura
   *antes* de leer precio, capacidad, temporadas o reservas existentes. Las solicitudes simultáneas se atienden
   en fila, y la segunda ya ve guardada la primera. Si algo falla, `ROLLBACK` deshace todo.
2. **Escritura condicional con subconsulta** (`insertarSiDisponible` y `modificarSiDisponible`):
   ```sql
   INSERT INTO reservas (...)
   SELECT ... FROM habitaciones hab JOIN hoteles h ON h.id = hab.hotel_id
   WHERE hab.hotel_id = :hotelId AND hab.id = :habitacionId
     AND hab.capacidad >= :huespedes
     AND hab.precio = :precioNoche          -- no se cobra un precio desactualizado
     AND NOT EXISTS (                        -- nadie ocupa esas noches
       SELECT 1 FROM reservas r
       WHERE r.hotel_id = hab.hotel_id AND r.habitacion_id = hab.id
         AND r.estado IN ('confirmada', 'check-in')
         AND r.entrada < :salida AND r.salida > :entrada)
   ```
   Comprobar y guardar es **una sola sentencia**. Si no se escribió ninguna fila, la API responde `409`
   e indica qué fechas están ocupadas.
3. **Triggers en la base de datos** (`trg_reservas_sin_solapamiento_insert` y `_update`). Rechazan cualquier
   `INSERT` o `UPDATE` que cree un solapamiento, aunque venga de otro proceso o de SQL escrito a mano.

Si otra transacción mantiene el bloqueo más de 5 s (`busy_timeout`), la API responde `503 SERVICIO_OCUPADO`.

## API

Base: `http://localhost:4000/api`. Las rutas protegidas requieren la cabecera `Authorization: Bearer <token>`.
Las respuestas exitosas vienen en `{ "datos": ... }`. Los errores siempre tienen esta forma:

```json
{ "error": { "codigo": "SOLICITUD_INVALIDA", "mensaje": "...", "detalles": [{ "campo": "body.correo", "mensaje": "..." }] } }
```

`GET /api` devuelve un índice con todas las rutas y `GET /api/salud` confirma que el servidor está vivo.

Códigos HTTP: `400` datos inválidos · `401` sin sesión · `403` sin permiso · `404` no existe · `409` conflicto ·
`422` regla de negocio · `429` cuenta bloqueada (`CUENTA_BLOQUEADA`, con `detalles.desbloqueo`) o demasiados intentos.

### Autenticación

| Método | Ruta                | Acceso  | Cuerpo / notas                                            |
| ------ | ------------------- | ------- | --------------------------------------------------------- |
| POST   | `/auth/registro`    | público | `{ nombre, correo, contrasena }` → `{ token, usuario }`   |
| POST   | `/auth/login`       | público | `{ correo, contrasena }` → `{ token, usuario }`           |
| POST   | `/auth/recuperar`   | público | `{ correo }` → mismo mensaje exista o no la cuenta        |
| POST   | `/auth/restablecer` | público | `{ token, contrasena }` → `{ token, usuario }` (sesión nueva) |
| GET    | `/auth/yo`          | sesión  | Usuario actual                                            |

La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.

### Catálogo y hoteles

| Método | Ruta                                     | Acceso  | Notas                                                      |
| ------ | ---------------------------------------- | ------- | ---------------------------------------------------------- |
| GET    | `/catalogo/destinos`, `/catalogo/colecciones` | público | Con `traducciones`                                   |
| GET    | `/catalogo/configuracion`                | público | Tasa del dólar, IVA, limpieza, días de cancelación gratis  |
| GET    | `/hoteles?destino=&huespedes=&coleccion=` | público | Búsqueda sin tildes por nombre, ubicación, destino o país (también en inglés) |
| GET    | `/hoteles/:id`                           | público | Incluye `imagenes`, `habitaciones`, `colecciones`, `destino`, `traducciones` y la calificación combinada |
| GET    | `/hoteles/:id/similares?cantidad=3`      | público | Prioriza el mismo destino                                  |
| GET    | `/hoteles/:id/disponibilidad?entrada=&salida=&huespedes=` | público | Cada habitación con `disponible` y `motivo` |
| GET    | `/hoteles/:id/calendario?desde=&hasta=`  | público | Noches ocupadas por habitación y temporadas (máx. 400 días) |
| GET    | `/hoteles/:id/cotizacion?habitacionId=&entrada=&salida=&huespedes=` | público | Precio noche por noche, total, disponibilidad y política de cancelación |
| GET    | `/hoteles/:id/resenas?limite=10`         | público | Reseñas verificadas (`autor` = nombre e inicial)           |
| POST   | `/hoteles`                               | admin   | `{ nombre, destinoId, ubicacion, precioNoche, descripcionCorta?, descripcion?, imagen?, colecciones?, traducciones? }` |
| PATCH  | `/hoteles/:id`                           | admin   | Cualquier subconjunto, más `imagenes: []` y `colecciones: []` |
| DELETE | `/hoteles/:id`                           | admin   | 409 si tiene reservas                                      |
| POST   | `/hoteles/:id/habitaciones`              | admin   | `{ nombre, precio, capacidad, detalle?, imagen?, destacado?, traducciones? }` |
| PATCH  | `/hoteles/:id/habitaciones/:habitacionId`| admin   |                                                            |
| DELETE | `/hoteles/:id/habitaciones/:habitacionId`| admin   | 409 si tiene reservas; 422 si es la última                 |

`traducciones` tiene la forma `{ "en": { "descripcion": "...", ... } }`. Si falta un texto, el sitio en inglés muestra el español.

### Reservas (todas requieren sesión)

| Método | Ruta                        | Acceso                    | Notas                                                   |
| ------ | --------------------------- | ------------------------- | ------------------------------------------------------- |
| POST   | `/reservas`                 | cualquier usuario         | `{ hotelId, habitacionId, entrada, salida, huespedes }` |
| GET    | `/reservas/mias`            | cualquier usuario         | Reservas propias, con `cancelacion`, `modificaciones` y `resenaId` |
| GET    | `/reservas?q=&estado=&hotelId=` | admin, recepcionista  | `q` busca por huésped, correo o código                  |
| GET    | `/reservas/exportar?q=&estado=&hotelId=` | admin       | CSV para Excel (separador `;`, UTF-8 con BOM, fórmulas neutralizadas) |
| GET    | `/reservas/:id`             | propietario o personal    |                                                         |
| PATCH  | `/reservas/:id`             | admin, recepcionista      | `{ habitacionId?, entrada?, salida?, huespedes? }`. Queda en el historial y se avisa al huésped |
| POST   | `/reservas/:id/check-in`    | admin, recepcionista      | Solo desde `confirmada` y desde el día de llegada       |
| POST   | `/reservas/:id/check-out`   | admin, recepcionista      | Solo desde `check-in`                                   |
| POST   | `/reservas/:id/cancelar`    | propietario o personal    | `{ exonerarCargo? }` (solo personal). Aplica la política de cancelación |

Las fechas usan el formato `AAAA-MM-DD`. Los montos son enteros en COP.

### Reseñas y temporadas

| Método | Ruta               | Acceso  | Notas |
| ------ | ------------------ | ------- | ----- |
| POST   | `/resenas`         | sesión  | `{ reservaId, calificacion, limpieza, ubicacion, calidadPrecio, atencion, comentario }` (puntajes 1–5) |
| GET    | `/resenas`         | admin   | Para moderar, con el correo del autor |
| DELETE | `/resenas/:id`     | admin   | La calificación del hotel se recalcula |
| GET    | `/temporadas`      | admin   | |
| POST   | `/temporadas`      | admin   | `{ nombre, inicio, fin, recargo, hotelId }`. `recargo` en % (−50 a 200, distinto de 0); `hotelId: null` = todos |
| PATCH / DELETE | `/temporadas/:id` | admin | Las reservas ya hechas conservan su precio |

### Administración

| Método | Ruta                               | Acceso | Notas |
| ------ | ---------------------------------- | ------ | ----- |
| GET    | `/admin/accesos?dias=14`           | admin  | Inicios de sesión, usuarios distintos, cuentas nuevas, intentos fallidos y bloqueados, accesos por día y actividad reciente |
| GET    | `/admin/metricas?desde=&hasta=`    | admin  | Periodo `[desde, hasta)`, máx. 2 años. Ocupación, ingresos, tarifa promedio por noche, RevPAR, cancelaciones; serie por día (≤ 62 días) o por mes, y desglose por hotel |

Los ingresos se reparten entre las noches de cada estadía (una reserva de 3 noches que cruza dos meses
suma a ambos) y se les agregan los cargos por cancelación cobrados en el periodo.

### Imágenes

| Método | Ruta                | Acceso  | Notas                                                                 |
| ------ | ------------------- | ------- | --------------------------------------------------------------------- |
| POST   | `/imagenes`         | admin   | `multipart/form-data` con el archivo en el campo `imagen` → `{ url, nombre, tipo, ancho, alto, tamano }` |
| GET    | `/uploads/<nombre>` | público | Sirve la imagen (fuera de `/api`)                                     |

- Solo se aceptan **JPG, PNG y WebP** de máximo 5 MB, comprobados por su contenido real (SVG no: puede contener JavaScript).
- Cada imagen se **convierte a WebP** y se guarda en tres tamaños: `<uuid>.webp` (1600 px), `<uuid>-800.webp` y
  `<uuid>-400.webp`. El sitio usa `srcset` para que cada pantalla descargue solo el tamaño que necesita.
- Se **quitan los metadatos** (como la ubicación GPS de una foto de celular) y se respeta la orientación de la foto.
- Imágenes de más de 40 megapíxeles o dañadas se rechazan con 400.
