-- Esquema de Velora. Las restricciones (CHECK, UNIQUE, FOREIGN KEY) son la última
-- línea de defensa: aunque la API valide todo, la base de datos nunca acepta datos inválidos.
-- Si cambias una tabla existente, sube VERSION_ESQUEMA en conexion.js (las BD viejas pedirán npm run db:reset).

CREATE TABLE IF NOT EXISTS usuarios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
  correo          TEXT    NOT NULL UNIQUE CHECK (correo = lower(correo) AND correo LIKE '%_@_%._%'),
  contrasena_hash TEXT    NOT NULL,
  rol             TEXT    NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'recepcionista', 'cliente')),
  -- Va dentro de cada token: al cambiar la contraseña sube, y los tokens anteriores dejan de servir.
  sesion_version  INTEGER NOT NULL DEFAULT 0 CHECK (sesion_version >= 0),
  creado_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Registro de accesos: inicios de sesión (exitosos o fallidos), registros, intentos rechazados por
-- bloqueo y contraseñas restablecidas. usuario_id queda NULL cuando el correo no existe; se guarda
-- el correo para ver intentos sospechosos. Se borran solos a los 90 días (son datos personales).
CREATE TABLE IF NOT EXISTS inicios_sesion (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  correo     TEXT    NOT NULL,
  tipo       TEXT    NOT NULL CHECK (tipo IN ('login', 'registro', 'bloqueo', 'restablecimiento')),
  exito      INTEGER NOT NULL CHECK (exito IN (0, 1)),
  ip         TEXT,
  navegador  TEXT,
  fecha      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_inicios_sesion_fecha ON inicios_sesion(fecha);
CREATE INDEX IF NOT EXISTS idx_inicios_sesion_usuario ON inicios_sesion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_inicios_sesion_correo ON inicios_sesion(correo, fecha);

-- Enlaces de "olvidé mi contraseña". Solo se guarda el hash del token: quien lea la BD no puede usarlos.
CREATE TABLE IF NOT EXISTS restablecimientos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  expira     TEXT    NOT NULL,
  usado_en   TEXT,
  creado_en  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- `traducciones` guarda los textos en otros idiomas: {"en": {"nombre": "...", ...}}.
-- Si falta una traducción, el sitio muestra el texto en español.
CREATE TABLE IF NOT EXISTS destinos (
  id           TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre       TEXT NOT NULL,
  pais         TEXT NOT NULL,
  imagen       TEXT NOT NULL,
  traducciones TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(traducciones))
);

CREATE TABLE IF NOT EXISTS colecciones (
  id           TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre       TEXT NOT NULL,
  imagen       TEXT NOT NULL,
  traducciones TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(traducciones))
);

-- calificacion, num_resenas y reputacion son las cifras de reseñas anteriores a Velora (importadas).
-- La API las combina con las reseñas verificadas de la tabla `resenas`.
CREATE TABLE IF NOT EXISTS hoteles (
  id                TEXT    PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre            TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 120),
  destino_id        TEXT    NOT NULL REFERENCES destinos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ubicacion         TEXT    NOT NULL CHECK (length(trim(ubicacion)) >= 2),
  calificacion      REAL    NOT NULL DEFAULT 0 CHECK (calificacion BETWEEN 0 AND 5),
  num_resenas       INTEGER NOT NULL DEFAULT 0 CHECK (num_resenas >= 0),
  precio_noche      INTEGER NOT NULL CHECK (precio_noche >= 0),
  descripcion_corta TEXT    NOT NULL DEFAULT '',
  descripcion       TEXT    NOT NULL DEFAULT '',
  reputacion        TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(reputacion)),
  testimonio        TEXT    CHECK (testimonio IS NULL OR json_valid(testimonio)),
  traducciones      TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(traducciones)),
  creado_en         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_hoteles_destino ON hoteles(destino_id);

CREATE TABLE IF NOT EXISTS hotel_colecciones (
  hotel_id     TEXT NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  coleccion_id TEXT NOT NULL REFERENCES colecciones(id) ON DELETE CASCADE,
  PRIMARY KEY (hotel_id, coleccion_id)
);

CREATE TABLE IF NOT EXISTS hotel_imagenes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id TEXT    NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  url      TEXT    NOT NULL,
  orden    INTEGER NOT NULL CHECK (orden >= 0),
  UNIQUE (hotel_id, orden)
);

CREATE TABLE IF NOT EXISTS habitaciones (
  hotel_id     TEXT    NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  id           TEXT    NOT NULL CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre       TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 120),
  detalle      TEXT    NOT NULL DEFAULT '',
  precio       INTEGER NOT NULL CHECK (precio > 0),
  capacidad    INTEGER NOT NULL CHECK (capacidad BETWEEN 1 AND 20),
  imagen       TEXT    NOT NULL,
  destacado    INTEGER NOT NULL DEFAULT 0 CHECK (destacado IN (0, 1)),
  traducciones TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(traducciones)),
  PRIMARY KEY (hotel_id, id)
);

-- Temporadas: recargo (o descuento, si es negativo) sobre el precio base de cada noche entre
-- `inicio` y `fin` (ambos incluidos). hotel_id NULL = aplica a todos los hoteles.
-- Si dos temporadas coinciden en una noche, se aplica la de mayor recargo.
CREATE TABLE IF NOT EXISTS temporadas (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre   TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
  inicio   TEXT    NOT NULL CHECK (date(inicio) = inicio),
  fin      TEXT    NOT NULL CHECK (date(fin) = fin),
  recargo  INTEGER NOT NULL CHECK (recargo BETWEEN -50 AND 200 AND recargo <> 0),
  hotel_id TEXT    REFERENCES hoteles(id) ON DELETE CASCADE,
  CHECK (fin >= inicio)
);
CREATE INDEX IF NOT EXISTS idx_temporadas_fechas ON temporadas(inicio, fin);

CREATE TABLE IF NOT EXISTS reservas (
  id                TEXT    PRIMARY KEY,
  codigo            TEXT    NOT NULL UNIQUE CHECK (codigo GLOB 'VEL-[0-9][0-9][0-9][0-9][0-9][0-9]'),
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  hotel_id          TEXT    NOT NULL,
  habitacion_id     TEXT    NOT NULL,
  -- Copia de los nombres al momento de reservar: el histórico no cambia si el hotel se edita.
  hotel_nombre      TEXT    NOT NULL,
  habitacion_nombre TEXT    NOT NULL,
  huesped_nombre    TEXT    NOT NULL,
  huesped_correo    TEXT    NOT NULL,
  entrada           TEXT    NOT NULL CHECK (date(entrada) = entrada),
  salida            TEXT    NOT NULL CHECK (date(salida) = salida),
  huespedes         INTEGER NOT NULL CHECK (huespedes BETWEEN 1 AND 20),
  noches            INTEGER NOT NULL CHECK (noches >= 1),
  -- Precio base por noche acordado al reservar. Cada noche puede costar más o menos según la temporada,
  -- por eso el subtotal es la suma de las noches y no precio_noche × noches.
  precio_noche      INTEGER NOT NULL CHECK (precio_noche > 0),
  subtotal          INTEGER NOT NULL CHECK (subtotal > 0),
  impuestos         INTEGER NOT NULL CHECK (impuestos >= 0),
  tarifa_limpieza   INTEGER NOT NULL CHECK (tarifa_limpieza >= 0),
  total             INTEGER NOT NULL CHECK (total = subtotal + impuestos + tarifa_limpieza),
  estado            TEXT    NOT NULL DEFAULT 'confirmada'
                    CHECK (estado IN ('confirmada', 'check-in', 'check-out', 'cancelada')),
  -- Lo que se cobra al cancelar fuera del plazo gratuito (0 si se canceló a tiempo o el hotel lo exoneró).
  cargo_cancelacion INTEGER CHECK (cargo_cancelacion IS NULL OR cargo_cancelacion BETWEEN 0 AND total),
  -- Quién canceló: el propio huésped o el hotel (recepción o admin). Así el huésped sabe qué pasó.
  cancelada_por     TEXT    CHECK (cancelada_por IS NULL OR cancelada_por IN ('huesped', 'hotel')),
  fecha_creacion    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  fecha_check_in    TEXT,
  fecha_check_out   TEXT,
  fecha_cancelacion TEXT,
  CHECK (salida > entrada),
  CHECK (julianday(salida) - julianday(entrada) = noches),
  CHECK (estado <> 'check-in'  OR fecha_check_in  IS NOT NULL),
  CHECK (estado <> 'check-out' OR (fecha_check_in IS NOT NULL AND fecha_check_out IS NOT NULL)),
  CHECK (estado <> 'cancelada' OR (fecha_cancelacion IS NOT NULL AND cargo_cancelacion IS NOT NULL)),
  -- Una habitación con reservas no se puede borrar: se conserva la trazabilidad.
  FOREIGN KEY (hotel_id, habitacion_id) REFERENCES habitaciones(hotel_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_habitacion_fechas ON reservas(hotel_id, habitacion_id, entrada, salida);

-- Historial de cambios hechos por recepción o el admin: quién, cuándo, qué y cómo cambió el total.
CREATE TABLE IF NOT EXISTS reserva_modificaciones (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_id     TEXT    NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  por_correo     TEXT    NOT NULL,
  detalle        TEXT    NOT NULL,
  total_anterior INTEGER NOT NULL,
  total_nuevo    INTEGER NOT NULL,
  fecha          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_modificaciones_reserva ON reserva_modificaciones(reserva_id);

-- Reseñas verificadas: una por reserva, y solo de reservas en las que el huésped ya hizo check-out.
CREATE TABLE IF NOT EXISTS resenas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_id     TEXT    NOT NULL UNIQUE REFERENCES reservas(id) ON DELETE CASCADE,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  hotel_id       TEXT    NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  calificacion   INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  limpieza       INTEGER NOT NULL CHECK (limpieza BETWEEN 1 AND 5),
  ubicacion      INTEGER NOT NULL CHECK (ubicacion BETWEEN 1 AND 5),
  calidad_precio INTEGER NOT NULL CHECK (calidad_precio BETWEEN 1 AND 5),
  atencion       INTEGER NOT NULL CHECK (atencion BETWEEN 1 AND 5),
  comentario     TEXT    NOT NULL CHECK (length(trim(comentario)) BETWEEN 10 AND 1000),
  fecha          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_resenas_hotel ON resenas(hotel_id, fecha);

-- Anti-solapamiento a nivel de base de datos. Dos estadías [entrada, salida) se cruzan cuando
-- una empieza antes de que la otra termine Y termina después de que la otra empiece.
-- Solo cuentan las reservas activas: cancelar o hacer check-out libera la habitación.
-- Aunque la API ya lo comprueba, estos triggers bloquean cualquier inserción o edición
-- que lo viole, venga de donde venga (otro proceso, un script o SQL manual).
CREATE TRIGGER IF NOT EXISTS trg_reservas_sin_solapamiento_insert
BEFORE INSERT ON reservas
WHEN NEW.estado IN ('confirmada', 'check-in')
BEGIN
  SELECT RAISE(ABORT, 'RESERVA_SOLAPADA: la habitación ya está reservada en esas fechas')
  WHERE EXISTS (
    SELECT 1 FROM reservas r
    WHERE r.hotel_id = NEW.hotel_id
      AND r.habitacion_id = NEW.habitacion_id
      AND r.estado IN ('confirmada', 'check-in')
      AND r.entrada < NEW.salida
      AND r.salida > NEW.entrada
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_reservas_sin_solapamiento_update
BEFORE UPDATE OF estado, entrada, salida, hotel_id, habitacion_id ON reservas
WHEN NEW.estado IN ('confirmada', 'check-in')
BEGIN
  SELECT RAISE(ABORT, 'RESERVA_SOLAPADA: la habitación ya está reservada en esas fechas')
  WHERE EXISTS (
    SELECT 1 FROM reservas r
    WHERE r.id <> NEW.id
      AND r.hotel_id = NEW.hotel_id
      AND r.habitacion_id = NEW.habitacion_id
      AND r.estado IN ('confirmada', 'check-in')
      AND r.entrada < NEW.salida
      AND r.salida > NEW.entrada
  );
END;

-- Una reseña solo puede venir de una estadía terminada, y del mismo huésped y hotel de la reserva.
CREATE TRIGGER IF NOT EXISTS trg_resenas_solo_estadias_terminadas
BEFORE INSERT ON resenas
BEGIN
  SELECT RAISE(ABORT, 'RESENA_NO_VERIFICADA: la reserva no terminó o no pertenece a este huésped')
  WHERE NOT EXISTS (
    SELECT 1 FROM reservas r
    WHERE r.id = NEW.reserva_id
      AND r.usuario_id = NEW.usuario_id
      AND r.hotel_id = NEW.hotel_id
      AND r.estado = 'check-out'
  );
END;
