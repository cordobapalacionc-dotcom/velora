-- Esquema de Velora. Las restricciones (CHECK, UNIQUE, FOREIGN KEY) son la última
-- línea de defensa: aunque la API valide todo, la base de datos nunca acepta datos inválidos.

CREATE TABLE IF NOT EXISTS usuarios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
  correo          TEXT    NOT NULL UNIQUE CHECK (correo = lower(correo) AND correo LIKE '%_@_%._%'),
  contrasena_hash TEXT    NOT NULL,
  rol             TEXT    NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'recepcionista', 'cliente')),
  creado_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS destinos (
  id     TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre TEXT NOT NULL,
  pais   TEXT NOT NULL,
  imagen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS colecciones (
  id     TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre TEXT NOT NULL,
  imagen TEXT NOT NULL
);

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
  creado_en         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_hoteles_destino ON hoteles(destino_id);

CREATE TABLE IF NOT EXISTS hotel_imagenes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id TEXT    NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  url      TEXT    NOT NULL,
  orden    INTEGER NOT NULL CHECK (orden >= 0),
  UNIQUE (hotel_id, orden)
);

CREATE TABLE IF NOT EXISTS habitaciones (
  hotel_id  TEXT    NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  id        TEXT    NOT NULL CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  nombre    TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 120),
  detalle   TEXT    NOT NULL DEFAULT '',
  precio    INTEGER NOT NULL CHECK (precio > 0),
  capacidad INTEGER NOT NULL CHECK (capacidad BETWEEN 1 AND 20),
  imagen    TEXT    NOT NULL,
  destacado INTEGER NOT NULL DEFAULT 0 CHECK (destacado IN (0, 1)),
  PRIMARY KEY (hotel_id, id)
);

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
  precio_noche      INTEGER NOT NULL CHECK (precio_noche > 0),
  subtotal          INTEGER NOT NULL CHECK (subtotal = precio_noche * noches),
  impuestos         INTEGER NOT NULL CHECK (impuestos >= 0),
  tarifa_limpieza   INTEGER NOT NULL CHECK (tarifa_limpieza >= 0),
  total             INTEGER NOT NULL CHECK (total = subtotal + impuestos + tarifa_limpieza),
  estado            TEXT    NOT NULL DEFAULT 'confirmada'
                    CHECK (estado IN ('confirmada', 'check-in', 'check-out', 'cancelada')),
  fecha_creacion    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  fecha_check_in    TEXT,
  fecha_check_out   TEXT,
  fecha_cancelacion TEXT,
  CHECK (salida > entrada),
  CHECK (julianday(salida) - julianday(entrada) = noches),
  CHECK (estado <> 'check-in'  OR fecha_check_in  IS NOT NULL),
  CHECK (estado <> 'check-out' OR (fecha_check_in IS NOT NULL AND fecha_check_out IS NOT NULL)),
  CHECK (estado <> 'cancelada' OR fecha_cancelacion IS NOT NULL),
  -- Una habitación con reservas no se puede borrar: se conserva la trazabilidad.
  FOREIGN KEY (hotel_id, habitacion_id) REFERENCES habitaciones(hotel_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_habitacion_fechas ON reservas(hotel_id, habitacion_id, entrada, salida);

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
