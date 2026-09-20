-- Ordenamiento Backend – esquema relacional
-- Postgres 16, sin extensiones. La búsqueda por contenido usa full-text
-- nativo (tsvector/tsquery en español): basta para localizar una
-- participación por lo que dice su PDF, sin embeddings ni pgvector.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Usuarios (admin crea físicas; usuario crea digitales) – relacional
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avatar de perfil (subido desde Mi Cuenta)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_ruta   TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_nombre TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime   TEXT NOT NULL DEFAULT '';

-- Corte de sesiones: toda sesión emitida ANTES de esta marca deja de valer.
-- Se adelanta al cambiar la contraseña, para que recuperar la cuenta expulse
-- de verdad a quien hubiera entrado con la contraseña anterior (la cookie de
-- sesión va firmada con SESSION_SECRET, no derivada del hash de la clave).
-- El valor por omisión es la época: al aplicar el schema en una base ya
-- desplegada, nadie pierde su sesión.
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_from TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0);

-- ---------------------------------------------------------------------------
-- Recuperación de contraseña (enlaces de un solo uso enviados por correo)
-- ---------------------------------------------------------------------------
-- Se guarda el SHA-256 del token, nunca el token en claro: si alguien lee la
-- tabla (backup, dump, SQL injection) no puede reconstruir un enlace válido,
-- igual que con `password_hash`.
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user    ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets (expires_at);

-- ---------------------------------------------------------------------------
-- Cambio de correo (verificado en la dirección NUEVA antes de aplicarse)
-- ---------------------------------------------------------------------------
-- Igual que en password_resets, se guarda solo el hash del token. El correo
-- nuevo se queda aquí «en espera»: la columna `users.email` no se toca hasta
-- que alguien demuestra que puede leer ese buzón.
CREATE TABLE IF NOT EXISTS email_changes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nuevo_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_changes_user ON email_changes (user_id);

-- ---------------------------------------------------------------------------
-- Bitácora de sesiones (quién entró, cuándo y cuánto tiempo estuvo)
-- ---------------------------------------------------------------------------
-- Una fila por sesión iniciada. `issued_at` es la marca que lleva dentro la
-- cookie firmada, así que identifica la sesión sin guardar el token.
-- `last_seen_at` se refresca con la actividad; el tiempo conectado es
-- COALESCE(ended_at, last_seen_at) - started_at.
CREATE TABLE IF NOT EXISTS user_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at    TIMESTAMPTZ NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  ip           TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT '',
  UNIQUE (user_id, issued_at)
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user  ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_fecha ON user_sessions (started_at DESC);

-- ---------------------------------------------------------------------------
-- Participaciones (física y digital son la MISMA entidad; origen distinto)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS participations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  creado_por   UUID REFERENCES users(id) ON DELETE SET NULL,
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
ALTER TABLE participations ADD COLUMN IF NOT EXISTS resuelto_por         UUID REFERENCES users(id) ON DELETE SET NULL;
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
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
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

-- (Tabla de historial de búsquedas eliminada en H3 2026-08-28: era tabla muerta, sin
--  lecturas/escrituras en el código; el endpoint que la llenaba se podó en la auditoría previa.)

-- ---------------------------------------------------------------------------
-- Personalización Visual y Marca (Site Customizations & Theming)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_customizations (
  id          INT PRIMARY KEY DEFAULT 1,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Auditoría de Seguridad e Historial de Cambios ("Quién y Por Qué")
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customization_audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name        TEXT NOT NULL,
  user_email       TEXT NOT NULL,
  motivo           TEXT NOT NULL DEFAULT '',
  section          TEXT NOT NULL DEFAULT 'general', -- 'usuario' | 'panel' | 'general'
  changes_summary  TEXT NOT NULL DEFAULT '',
  snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customization_audit_fecha ON customization_audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Actividades y avances del Programa
-- ---------------------------------------------------------------------------
-- Cada actividad se registra UNA sola vez y el portal decide dónde mostrarla
-- según su fecha, su estado y su publicación: programada → próximas
-- actividades y calendario; realizada → avances del Programa; con aviso en
-- vigencia → franja de avisos de la portada. Borrador y oculto nunca salen.
--
-- Sustituye a las tablas separadas de avisos, reuniones, sesiones POEL y al
-- repositorio de documentos. Sus datos los trae
-- migrations/002_actividades_programa.sql; las tablas viejas se quedan como
-- respaldo en las bases que ya las tenían, sin que el código las use.
--
-- Las restricciones llevan nombre fijo porque la migración 002 las crea con
-- el mismo nombre en las bases anteriores: así una migración futura puede
-- sustituirlas sin distinguir cómo nació cada base.

CREATE TABLE IF NOT EXISTS actividades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            TEXT NOT NULL,
  fase              TEXT NOT NULL DEFAULT 'Formulación',
  tipo              TEXT NOT NULL DEFAULT 'Otra',
  estado            TEXT NOT NULL DEFAULT 'programada',
  fecha             DATE NOT NULL,
  hora_inicio       TEXT NOT NULL DEFAULT '',
  hora_fin          TEXT NOT NULL DEFAULT '',
  lugar             TEXT NOT NULL DEFAULT '',
  -- Dirección escrita o enlace de Google Maps; las coordenadas van aparte
  -- porque una cosa es cómo se lee el lugar y otra dónde cae en el mapa.
  direccion         TEXT NOT NULL DEFAULT '',
  latitud           TEXT NOT NULL DEFAULT '',
  longitud          TEXT NOT NULL DEFAULT '',
  descripcion       TEXT NOT NULL DEFAULT '',
  resultados        TEXT NOT NULL DEFAULT '',
  acuerdos          TEXT NOT NULL DEFAULT '',
  publicacion       TEXT NOT NULL DEFAULT 'publicado',
  -- «Mostrar también como aviso»: el aviso pertenece a la actividad y solo
  -- aparece en la franja de la portada dentro de su vigencia.
  aviso_activo      BOOLEAN NOT NULL DEFAULT false,
  aviso_titulo      TEXT NOT NULL DEFAULT '',
  aviso_descripcion TEXT NOT NULL DEFAULT '',
  aviso_inicio      DATE,
  aviso_fin         DATE,
  creado_por        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT actividades_fase_check CHECK (fase IN (
    'Formulación','Expedición','Ejecución','Evaluación','Modificación')),
  CONSTRAINT actividades_tipo_check CHECK (tipo IN (
    'Sesión del Comité','Sesión del Consejo','Sesión de Cabildo','Foro','Taller',
    'Mesa de trabajo','Reunión técnica','Presentación','Consulta pública',
    'Firma de convenio','Aprobación','Publicación de producto técnico','Otra')),
  CONSTRAINT actividades_estado_check CHECK (estado IN (
    'programada','realizada','reprogramada','cancelada')),
  CONSTRAINT actividades_publicacion_check CHECK (publicacion IN (
    'borrador','publicado','oculto')),
  CONSTRAINT actividades_aviso_vigencia_check CHECK (
    NOT aviso_activo
    OR (aviso_inicio IS NOT NULL AND aviso_fin IS NOT NULL AND aviso_fin >= aviso_inicio))
);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha  ON actividades (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_actividades_estado ON actividades (estado);

-- Archivos de la actividad (convocatoria, acta, fotografías…). Viven con su
-- actividad: se suben una vez y aparecen en su ficha, en los avances y en el
-- repositorio público de documentos sin volver a cargarlos.
CREATE TABLE IF NOT EXISTS actividad_archivos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id    UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'Otro',
  -- Nombre para mostrar; vacío = el nombre del archivo.
  titulo          TEXT NOT NULL DEFAULT '',
  nombre_original TEXT NOT NULL,
  mime            TEXT NOT NULL,
  size            BIGINT NOT NULL DEFAULT 0,
  ruta_local      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT actividad_archivos_tipo_check CHECK (tipo IN (
    'Convocatoria','Orden del día','Acta','Acuerdo','Lista de asistencia','Presentación',
    'Dictamen','Documento aprobado','Fotografía','Otro'))
);
CREATE INDEX IF NOT EXISTS idx_actividad_archivos_actividad ON actividad_archivos (actividad_id);

-- ---------------------------------------------------------------------------
-- Seguimiento y evaluación — Indicadores
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS indicadores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               TEXT NOT NULL,
  descripcion          TEXT NOT NULL DEFAULT '',
  unidad               TEXT NOT NULL DEFAULT '',
  meta                 NUMERIC,
  fecha_evaluacion     TEXT NOT NULL DEFAULT '',
  resultado_texto      TEXT NOT NULL DEFAULT '',
  -- El documento de respaldo es un archivo de alguna actividad (p. ej. el
  -- informe de evaluación publicado como producto técnico).
  documento_respaldo_id UUID REFERENCES actividad_archivos(id) ON DELETE SET NULL,
  creado_por           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_indicadores_nombre ON indicadores (nombre);

CREATE TABLE IF NOT EXISTS mediciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id  UUID NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
  periodo       TEXT NOT NULL DEFAULT '',
  valor         NUMERIC NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mediciones_indicador ON mediciones (indicador_id);
