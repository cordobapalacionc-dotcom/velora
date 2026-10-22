# Velora

Plataforma de reservas de hoteles boutique: catálogo de destinos, detalle de hoteles con calendario de
disponibilidad, reservas con precios por temporada en pesos colombianos (COP), reseñas verificadas y
paneles para administración y recepción. Disponible en español e inglés.

## Contenido del repositorio

| Carpeta                | Qué es                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| [`Velora/`](Velora/)   | Frontend: React 19 + Vite + React Router                                 |
| [`backend/`](backend/) | API REST: Node.js + Express 5 + SQLite, con autenticación JWT y roles    |

El frontend no guarda datos en el navegador (solo la sesión y la preferencia de idioma y moneda):
todo vive en el backend, así que lo que hace un cliente lo ve recepción desde cualquier equipo.

## Requisitos

- [Node.js](https://nodejs.org/) 22.13 o superior (incluye SQLite, no hace falta instalar una base de datos)

## Cómo ejecutarlo

Abre dos terminales. **El backend debe estar encendido** para que el sitio funcione.

**1. Backend** (http://localhost:4000/api)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

La base de datos se crea sola la primera vez, con los hoteles de ejemplo. Si vienes de una versión anterior,
ejecuta `npm run db:reset` una vez (el servidor te lo indica al arrancar).

**2. Frontend** (http://localhost:5173)

```bash
cd Velora
npm install
npm run dev
```

## Roles y cuentas de prueba

| Rol           | Puede                                                     | Cuenta demo                           |
| ------------- | --------------------------------------------------------- | ------------------------------------- |
| Cliente       | Buscar, reservar, cancelar, opinar después de su estadía  | Se crea desde "Crear cuenta"          |
| Recepcionista | Ver todas las reservas, check-in y check-out, modificar y cancelar | `recepcion@velora.com` / `recepcion123` |
| Administrador | Todo lo anterior, más hoteles, temporadas, reseñas, métricas, accesos y exportar a Excel | `admin@velora.com` / `admin123` |

Las cuentas demo solo existen en desarrollo; el backend no las crea en producción.
**Antes de publicar el sitio:** define `NODE_ENV=production` y un `JWT_SECRETO` largo y aleatorio en `backend/.env`,
configura el correo (SMTP) y usa una base de datos alojada.

## Funciones

**Para los huéspedes**
- Búsqueda sin tildes por destino, país o colección.
- Calendario de disponibilidad por habitación: noches ocupadas tachadas y temporadas marcadas.
- Precio exacto noche por noche, calculado por el servidor (temporada alta, baja, Semana Santa…).
- Política de cancelación clara: gratis hasta 48 horas antes; después se cobra una noche.
- Correos de confirmación, de cambios hechos por el hotel y de cancelación.
- Reseñas verificadas: solo opina quien se alojó (después del check-out).
- Recuperar la contraseña con un enlace de un solo uso.
- Sitio en español o inglés y precios en COP o en dólares (aproximados).
- Página de políticas de cancelación y de privacidad (Ley 1581 de 2012).

**Para el hotel**
- Recepción y admin modifican o cancelan reservas (con opción de exonerar el cargo); queda el historial.
- Dashboard de ocupación e ingresos: ocupación, ingresos, tarifa promedio por noche, RevPAR y cancelaciones,
  por día o por mes y por hotel.
- Temporadas con recargo o descuento, generales o por hotel.
- Moderación de reseñas, edición de hoteles con textos en inglés, exportación de reservas a Excel (CSV).
- Dashboard de accesos con intentos fallidos y bloqueados.

**Seguridad y calidad**
- Sin reservas simultáneas de una misma habitación: transacciones, subconsulta `NOT EXISTS` y triggers.
  [Ver cómo funciona](backend/README.md#reservas-simultáneas).
- Bloqueo temporal de la cuenta tras 5 intentos fallidos; cambiar la contraseña cierra las demás sesiones.
- Los registros de acceso (IP y navegador) se borran solos a los 90 días.
- Imágenes subidas convertidas a WebP en tres tamaños y sin metadatos (como la ubicación GPS).
- Páginas de administración y recepción cargadas aparte, para que el sitio público sea más liviano.
- 72 pruebas automáticas del backend (`cd backend && npm test`) que se ejecutan en GitHub Actions en cada cambio.

Documentación completa de la API, sus endpoints y sus reglas: [`backend/README.md`](backend/README.md).

## Próximos pasos

- [ ] Pagos en línea (anticipo o pago total).
- [ ] Facturación electrónica (DIAN).
- [ ] Migrar la base de datos a Supabase (PostgreSQL) para publicar el sitio.
