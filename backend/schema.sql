-- Ordenamiento Backend – esquema relacional + vectorial
-- Postgres 16 con extensión pgvector

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Usuarios (admin crea físicas; usuario crea digitales) – relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Participaciones (física y digital son la MISMA entidad; origen distinto)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS participations (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  folio        TEXT NOT NULL UNIQUE,             -- autogenerado SPAGU-DGTPU-E-000X
  origen       TEXT NOT NULL DEFAULT 'digital',  -- 'digital' | 'fisica'
  nombre       TEXT NOT NULL,
  correo       TEXT NOT NULL,
  calle        TEXT NOT NULL DEFAULT '',
  numero       TEXT NOT NULL DEFAULT '',
  colonia      TEXT NOT NULL DEFAULT '',
  municipio    TEXT NOT NULL DEFAULT '',
  institucion  TEXT NOT NULL DEFAULT '',
  ocupacion    TEXT NOT NULL DEFAULT '',
  latitud      TEXT NOT NULL DEFAULT '',
  longitud     TEXT NOT NULL DEFAULT '',
  observacion  TEXT NOT NULL DEFAULT '',
  estado       TEXT NOT NULL DEFAULT 'En proceso', -- 'En proceso' | 'Procedente' | 'No procedente'
  fuente       TEXT NOT NULL DEFAULT '',           -- Empresa | Dependencia | Organización | Persona ciudadana | Otra
  genero       TEXT NOT NULL DEFAULT '',           -- Hombre | Mujer | Otro
  tematica     TEXT NOT NULL DEFAULT '',           -- Servicios Ambientales | Gestión del Agua | ...
  creado_por   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participations_origen  ON participations (origen);
CREATE INDEX IF NOT EXISTS idx_participations_estado  ON participations (estado);
CREATE INDEX IF NOT EXISTS idx_participations_fecha   ON participations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participations_folio   ON participations (folio);
CREATE INDEX IF NOT EXISTS idx_participaciones_nombre ON participations (nombre);

-- Columnas de métricas (por si la tabla ya existía sin ellas)
ALTER TABLE participations ADD COLUMN IF NOT EXISTS fuente   TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS genero   TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS tematica TEXT NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- Adjuntos (archivos subidos: PDF, DWG, JPG, SHX, ...) – relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attachments (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participation_id BIGINT NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
  nombre_original  TEXT NOT NULL,
  mime             TEXT NOT NULL,
  size             BIGINT NOT NULL,
  ruta_local       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_participation ON attachments (participation_id);

-- ---------------------------------------------------------------------------
-- Chunks vectoriales (contenido de PDF + campos del formulario)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS participation_chunks (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participation_id BIGINT NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
  position         INT NOT NULL,
  content          TEXT NOT NULL,
  embedding        vector(512) NOT NULL,          -- 512 features TF-IDF
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_participation ON participation_chunks (participation_id);

-- Índice HNSW opcional para acelerar cuando crezca (usa más RAM al construir).
-- Por defecto: búsqueda exacta (mínimo absoluto). Descomentar si crece:

-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON participation_chunks
--   USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Historial de búsquedas (auditoría) – relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS search_history (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  query      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Skill knowledge (RAG: conocimiento reutilizable) — relacional + vectorial
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS skill_knowledge (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'general',  -- 'patron' | 'decision' | 'dominio' | 'general'
  content    TEXT NOT NULL,
  embedding  vector(512) NOT NULL,             -- 512 features TF-IDF
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_knowledge_kind ON skill_knowledge (kind);

-- ---------------------------------------------------------------------------
-- Reuniones (bitácora administrativa) — relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reuniones (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo       TEXT NOT NULL,
  fecha        DATE NOT NULL,
  hora_inicio  TEXT NOT NULL DEFAULT '',
  hora_fin     TEXT NOT NULL DEFAULT '',
  creado_por   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Avisos (bitácora) — relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS avisos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo      TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  activo      BOOLEAN NOT NULL DEFAULT true,
  creado_por  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Sesiones POEL — relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS poel_sesiones (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria   TEXT NOT NULL DEFAULT '',
  orden       INT NOT NULL DEFAULT 0,
  titulo      TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  fecha       DATE,
  ubicacion   TEXT NOT NULL DEFAULT '',
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
