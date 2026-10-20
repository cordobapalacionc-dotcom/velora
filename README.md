# Velora

Plataforma de reservas de hoteles boutique: catálogo de destinos, detalle de hoteles con habitaciones,
reservas con cálculo de precio en pesos colombianos (COP), y paneles para administración y recepción.

## Contenido del repositorio

| Carpeta                | Qué es                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| [`Velora/`](Velora/)   | Frontend: React 19 + Vite + React Router                                 |
| [`backend/`](backend/) | API REST: Node.js + Express 5 + SQLite, con autenticación JWT y roles    |

> El frontend todavía guarda los datos en `localStorage`. El backend ya está listo para reemplazarlo;
> la guía de integración está en [`backend/README.md`](backend/README.md#conectar-el-frontend).

## Requisitos

- [Node.js](https://nodejs.org/) 22.13 o superior (incluye SQLite, no hace falta instalar una base de datos)

## Cómo ejecutarlo

Abre dos terminales.

**1. Backend** (http://localhost:4000/api)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

La base de datos se crea sola la primera vez, con los hoteles de ejemplo.

**2. Frontend** (http://localhost:5173)

```bash
cd Velora
npm install
npm run dev
```

## Roles y cuentas de prueba

| Rol           | Puede                                                     | Cuenta demo                           |
| ------------- | --------------------------------------------------------- | ------------------------------------- |
| Cliente       | Buscar hoteles, reservar, ver y cancelar sus reservas     | Se crea desde "Crear cuenta"          |
| Recepcionista | Ver todas las reservas, hacer check-in y check-out        | `recepcion@velora.com` / `recepcion123` |
| Administrador | Todo lo anterior, más gestionar hoteles y habitaciones    | `admin@velora.com` / `admin123`       |

Las cuentas demo solo existen en desarrollo; el backend no las crea en producción.

## Características del backend

- Arquitectura por capas: rutas → validación → reglas de negocio → acceso a datos.
- Contraseñas con hash bcrypt y sesiones con JWT.
- El precio de la reserva lo calcula el servidor (noches × tarifa + 19 % de impuestos + limpieza).
- **Sin reservas simultáneas de una misma habitación**: transacciones, inserción condicional con
  subconsulta `NOT EXISTS` y triggers en la base de datos.
  [Ver cómo funciona](backend/README.md#reservas-simultáneas).
- Subida de imágenes desde el panel de administración (JPG, PNG o WebP, verificadas por su contenido).
- 30 pruebas automáticas de integración, concurrencia e imágenes (`cd backend && npm test`).

Documentación completa de la API, sus endpoints y sus reglas: [`backend/README.md`](backend/README.md).

## Próximos pasos

- [ ] Conectar el frontend a la API en lugar de `localStorage`.
- [ ] Migrar la base de datos a Supabase (PostgreSQL).
