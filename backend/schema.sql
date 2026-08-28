-- Ordenamiento Backend – esquema relacional
-- Postgres 16, sin extensiones. La búsqueda por contenido usa full-text
-- nativo (tsvector/tsquery en español): basta para localizar una
-- participación por lo que dice su PDF, sin embeddings ni pgvector.

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
  consentimiento_en      TIMESTAMPTZ,
  consentimiento_version TEXT NOT NULL DEFAULT '',
  codigo_postal          TEXT NOT NULL DEFAULT '',
  direccion_origen       TEXT NOT NULL DEFAULT '',
  -- Domicilio de quien participa. Es distinto de calle/colonia/municipio, que
  -- describen el lugar del aporte; la captura física registra ambos.
  domicilio              TEXT NOT NULL DEFAULT '',
  municipio_participante TEXT NOT NULL DEFAULT '',
  creado_por   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participations_origen  ON participations (origen);
CREATE INDEX IF NOT EXISTS idx_participations_estado  ON participations (estado);
CREATE INDEX IF NOT EXISTS idx_participations_fecha   ON participations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participations_folio   ON participations (folio);
CREATE INDEX IF NOT EXISTS idx_participaciones_nombre ON participations (nombre);

-- Columnas de métricas y auditoría (por si la tabla ya existía sin ellas)
ALTER TABLE participations ADD COLUMN IF NOT EXISTS fuente   TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS genero   TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS tematica TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS consentimiento_en      TIMESTAMPTZ;
ALTER TABLE participations ADD COLUMN IF NOT EXISTS consentimiento_version TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS codigo_postal          TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS direccion_origen       TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS domicilio              TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS municipio_participante TEXT NOT NULL DEFAULT '';

-- Dictamen y notificacion al ciudadano. `estado` dice QUE se resolvio;
-- estas columnas dicen POR QUE, A DONDE debe acudir y SI ya se le aviso.
ALTER TABLE participations ADD COLUMN IF NOT EXISTS resolucion_motivo    TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS resolucion_direccion TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS resolucion_cita      TEXT NOT NULL DEFAULT '';
ALTER TABLE participations ADD COLUMN IF NOT EXISTS resolucion_en        TIMESTAMPTZ;
ALTER TABLE participations ADD COLUMN IF NOT EXISTS resuelto_por         BIGINT REFERENCES users(id) ON DELETE SET NULL;
-- Sello del correo de dictamen: mientras sea NULL, la participacion esta
-- resuelta pero el ciudadano todavia no lo sabe.
ALTER TABLE participations ADD COLUMN IF NOT EXISTS notificado_en        TIMESTAMPTZ;
ALTER TABLE participations ADD COLUMN IF NOT EXISTS notificado_a         TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_participations_notificado ON participations (notificado_en);

-- Índice full-text de los campos del formulario. Columna generada: se
-- mantiene sola en cada INSERT/UPDATE, sin triggers ni código de app.
ALTER TABLE participations ADD COLUMN IF NOT EXISTS busqueda_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish',
    coalesce(folio, '') || ' ' || coalesce(nombre, '') || ' ' ||
    coalesce(observacion, '') || ' ' || coalesce(colonia, '') || ' ' ||
    coalesce(municipio, '') || ' ' || coalesce(institucion, '') || ' ' ||
    coalesce(ocupacion, '') || ' ' || coalesce(tematica, '')
  )) STORED;

CREATE INDEX IF NOT EXISTS idx_participations_tsv ON participations USING gin (busqueda_tsv);

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

-- Texto extraído del PDF (capa de texto). Vacío si el archivo no es PDF o
-- es un escaneo sin capa de texto; en ese caso solo se puede ver/descargar.
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS texto_extraido TEXT NOT NULL DEFAULT '';
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS texto_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', texto_extraido)) STORED;

CREATE INDEX IF NOT EXISTS idx_attachments_tsv ON attachments USING gin (texto_tsv);

-- ---------------------------------------------------------------------------
-- Migración: retirada de la base vectorial
-- ---------------------------------------------------------------------------
-- `participation_chunks` y `skill_knowledge` guardaban embeddings TF-IDF de
-- 512 dimensiones sobre pgvector. Se retiran: el texto del PDF vive ahora en
-- attachments.texto_extraido y se busca con full-text nativo.
--
-- IMPORTANTE al desplegar sobre un volumen existente: estas sentencias deben
-- correr con la imagen pgvector todavía activa. Solo después de que hayan
-- corrido una vez se puede cambiar la imagen a `postgres:16`.
DROP TABLE IF EXISTS participation_chunks;
DROP TABLE IF EXISTS skill_knowledge;
DROP EXTENSION IF EXISTS vector;

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

-- ---------------------------------------------------------------------------
-- Personalización Visual y Marca (Site Customizations & Theming)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_customizations (
  id          INT PRIMARY KEY DEFAULT 1,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Auditoría de Seguridad e Historial de Cambios ("Quién y Por Qué")
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customization_audit_logs (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name        TEXT NOT NULL,
  user_email       TEXT NOT NULL,
  motivo           TEXT NOT NULL DEFAULT '',
  section          TEXT NOT NULL DEFAULT 'general', -- 'usuario' | 'panel' | 'general'
  changes_summary  TEXT NOT NULL DEFAULT '',
  snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customization_audit_fecha ON customization_audit_logs (created_at DESC);
