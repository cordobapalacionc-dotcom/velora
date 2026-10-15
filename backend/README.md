# Velora — Backend

API REST para el sitio de reservas de hoteles **Velora** (frontend en `../Velora`).
Reemplaza el almacenamiento en `localStorage` por un servidor con base de datos, autenticación
real y reglas de negocio que el navegador no puede saltarse.

**Stack:** Node.js ≥ 22.13 · Express 5 · SQLite (`node:sqlite`, sin dependencias nativas) · Zod · JWT · bcrypt

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

La base de datos se crea y se llena sola la primera vez con los hoteles del frontend.

**Cuentas demo** (solo fuera de producción):

| Rol           | Correo                 | Contraseña     |
| ------------- | ---------------------- | -------------- |
| admin         | admin@velora.com       | admin123       |
| recepcionista | recepcion@velora.com   | recepcion123   |

## Estructura

```
backend/
├── src/
│   ├── server.js              # Arranque y apagado ordenado
│   ├── app.js                 # Express: seguridad, CORS, rutas, errores
│   ├── config/env.js          # Variables de entorno validadas (falla al arrancar si son inválidas)
│   ├── db/
│   │   ├── esquema.sql        # Tablas con CHECK, UNIQUE y FOREIGN KEY
│   │   ├── conexion.js        # Conexión SQLite + helper de transacciones
│   │   ├── sembrar.js         # Datos iniciales
│   │   ├── reiniciar.js       # npm run db:reset
│   │   └── datos/semilla.js   # Catálogo copiado del frontend
│   ├── middlewares/
│   │   ├── autenticacion.js   # autenticar (JWT) y autorizar(...roles)
│   │   ├── validar.js         # Validación Zod de params/query/body
│   │   └── errores.js         # Respuesta de error uniforme + 404
│   ├── modules/               # Un módulo por dominio
│   │   ├── auth/              # rutas · esquemas · servicio · repositorio
│   │   ├── catalogo/
│   │   ├── hoteles/           # hoteles y habitaciones
│   │   └── reservas/
│   └── utils/
└── tests/api.test.js
```

Cada módulo sigue las mismas capas, y cada capa solo habla con la siguiente:

```
rutas  →  esquemas (validación)  →  servicio (reglas de negocio)  →  repositorio (SQL)
```

- **Rutas:** declaran URL, permisos y esquema. No contienen lógica.
- **Esquemas:** Zod en modo estricto; un campo desconocido es un error 400.
- **Servicio:** reglas de negocio y transacciones. Lanza `AppError` con el código HTTP adecuado.
- **Repositorio:** único lugar con SQL; siempre consultas parametrizadas.

## Reglas que el backend garantiza

- **Contraseñas** con hash bcrypt (nunca en texto plano). El registro público solo crea `cliente`.
- **El precio lo calcula el servidor**: subtotal = precio × noches, impuestos 19 %, limpieza $180.000.
  Si el cliente envía `total`, `subtotal` u otro campo extra, la solicitud se rechaza.
- **Sin dobles reservas**: una habitación no puede tener dos reservas activas que se crucen
  (salir y entrar el mismo día sí está permitido). Ver [Reservas simultáneas](#reservas-simultáneas).
- **Fechas**: llegada no anterior a hoy, máximo 365 días de anticipación y 30 noches.
- **Capacidad**: los huéspedes no pueden superar la capacidad de la habitación.
- **Máquina de estados**: `confirmada → check-in → check-out` y `confirmada → cancelada`.
  Cualquier otra transición devuelve 422. El check-in solo es posible entre la fecha de llegada y la de salida.
- **Privacidad**: un cliente solo ve y cancela sus reservas. Una reserva ajena responde 404, no 403.
- **Integridad**: no se borran hoteles ni habitaciones con reservas (409), y un hotel conserva siempre al menos una habitación.
- **La base de datos repite estas reglas** con `CHECK` (por ejemplo, `total = subtotal + impuestos + tarifa_limpieza`
  y `salida > entrada`), así que ni un error de programación puede guardar datos incoherentes.
- **Seguridad HTTP**: Helmet, CORS con lista blanca, límite de 100 kB por cuerpo y límite de intentos en login y registro.

## Reservas simultáneas

Dos estadías `[entrada, salida)` se cruzan cuando `a.entrada < b.salida AND a.salida > b.entrada`.
Solo cuentan las reservas activas (`confirmada` o `check-in`). Para que dos personas que reservan
la misma habitación en el mismo instante no puedan quedarse ambas con ella, hay tres capas:

1. **Transacción `BEGIN IMMEDIATE`** (`reservasServicio.crear`). Toma el bloqueo de escritura
   *antes* de leer precio, capacidad o reservas existentes. Las solicitudes simultáneas se atienden
   en fila, y la segunda ya ve guardada la primera. Si algo falla, `ROLLBACK` deshace todo.
2. **Inserción condicional con subconsulta** (`reservasRepositorio.insertarSiDisponible`):
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
   Comprobar y guardar es **una sola sentencia**, así que no hay hueco entre las dos. Si no se
   insertó ninguna fila, la API responde `409` e indica qué fechas están ocupadas.
3. **Triggers en la base de datos** (`trg_reservas_sin_solapamiento_insert` y `_update` en `esquema.sql`).
   Rechazan con `RAISE(ABORT)` cualquier `INSERT` o `UPDATE` que cree un solapamiento, aunque venga
   de otro proceso, de un script o de SQL escrito a mano. También impiden reactivar una reserva
   cancelada si la habitación ya se volvió a ocupar.

Si otra transacción mantiene el bloqueo más de 5 s (`busy_timeout`), la API responde
`503 SERVICIO_OCUPADO` en lugar de esperar indefinidamente.

`tests/concurrencia.test.js` lo comprueba de tres formas:
- envía 20 solicitudes simultáneas por la misma habitación y verifica que exactamente 1 gana;
- lanza una ráfaga de 40 rangos aleatorios y audita con un *self-join* que no quede ningún par solapado;
- abre dos conexiones al mismo archivo, como si fueran dos servidores, para ver el bloqueo y el `ROLLBACK`.

## API

Base: `http://localhost:4000/api`. Las rutas protegidas requieren la cabecera `Authorization: Bearer <token>`.
Las respuestas exitosas vienen en `{ "datos": ... }`. Los errores siempre tienen esta forma:

```json
{ "error": { "codigo": "SOLICITUD_INVALIDA", "mensaje": "...", "detalles": [{ "campo": "body.correo", "mensaje": "..." }] } }
```

Códigos HTTP: `400` datos inválidos · `401` sin sesión · `403` sin permiso · `404` no existe · `409` conflicto · `422` regla de negocio.

### Autenticación

| Método | Ruta             | Acceso  | Cuerpo / notas                                            |
| ------ | ---------------- | ------- | --------------------------------------------------------- |
| POST   | `/auth/registro` | público | `{ nombre, correo, contrasena }` → `{ token, usuario }`   |
| POST   | `/auth/login`    | público | `{ correo, contrasena }` → `{ token, usuario }`           |
| GET    | `/auth/yo`       | sesión  | Usuario actual                                            |

La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.

### Catálogo y hoteles

| Método | Ruta                                     | Acceso  | Notas                                                      |
| ------ | ---------------------------------------- | ------- | ---------------------------------------------------------- |
| GET    | `/catalogo/destinos`                     | público |                                                            |
| GET    | `/catalogo/colecciones`                  | público |                                                            |
| GET    | `/hoteles?destino=&huespedes=`           | público | Búsqueda por ciudad, país, nombre o destino                |
| GET    | `/hoteles/:id`                           | público | Incluye `imagenes` y `habitaciones`                        |
| GET    | `/hoteles/:id/similares?cantidad=3`      | público | Prioriza el mismo destino                                  |
| GET    | `/hoteles/:id/disponibilidad?entrada=&salida=&huespedes=` | público | Cada habitación con `disponible` y `motivo` |
| POST   | `/hoteles`                               | admin   | `{ nombre, destinoId, ubicacion, precioNoche, descripcionCorta?, descripcion?, imagen? }` |
| PATCH  | `/hoteles/:id`                           | admin   | Cualquier subconjunto de campos, más `imagenes: []`        |
| DELETE | `/hoteles/:id`                           | admin   | 409 si tiene reservas                                      |
| POST   | `/hoteles/:id/habitaciones`              | admin   | `{ nombre, precio, capacidad, detalle?, imagen?, destacado? }` |
| PATCH  | `/hoteles/:id/habitaciones/:habitacionId`| admin   |                                                            |
| DELETE | `/hoteles/:id/habitaciones/:habitacionId`| admin   | 409 si tiene reservas; 422 si es la última                 |

### Reservas (todas requieren sesión)

| Método | Ruta                        | Acceso                    | Notas                                                   |
| ------ | --------------------------- | ------------------------- | ------------------------------------------------------- |
| POST   | `/reservas`                 | cualquier usuario         | `{ hotelId, habitacionId, entrada, salida, huespedes }` |
| GET    | `/reservas/mias`            | cualquier usuario         | Reservas propias                                        |
| GET    | `/reservas?q=&estado=&hotelId=` | admin, recepcionista  | `q` busca por huésped, correo o código                  |
| GET    | `/reservas/:id`             | propietario o personal    |                                                         |
| POST   | `/reservas/:id/check-in`    | admin, recepcionista      | Solo desde `confirmada`                                 |
| POST   | `/reservas/:id/check-out`   | admin, recepcionista      | Solo desde `check-in`                                   |
| POST   | `/reservas/:id/cancelar`    | propietario o personal    | Solo desde `confirmada`                                 |

Las fechas usan el formato `AAAA-MM-DD`. Los montos son enteros en COP.

## Conectar el frontend

Los objetos de la API usan los mismos nombres de campo que el frontend (`precioNoche`, `habitaciones`,
`huespedNombre`, etc.), así que la migración consiste en reemplazar las funciones de
`src/services/hotelesStore.js`, `reservasStore.js` y `AuthContext.jsx` por llamadas `fetch`:

```js
const API = 'http://localhost:4000/api'

export async function api(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.error.mensaje)
  return json
}
```

Diferencias con la versión de `localStorage`:

- `crearReserva` ya no envía `noches`, `subtotal`, `impuestos`, `total` ni los datos del huésped: el servidor los calcula.
- El código de reserva tiene 6 dígitos (`VEL-123456`).
- Las llamadas son asíncronas, por lo que las páginas deben manejar estados de carga.
