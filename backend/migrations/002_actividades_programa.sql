-- Migración 002: «Actividades y avances del Programa»
--
-- El panel capturaba por separado avisos, reuniones, sesiones POEL,
-- actividades y el repositorio de documentos. Desde esta versión todo vive en
-- `actividades` (+ `actividad_archivos`): cada actividad se registra una sola
-- vez y el portal decide dónde mostrarla según su fecha, estado y publicación.
--
-- Esta migración trae a ese modelo lo que ya estaba capturado:
--   · actividades       → se amplían en su sitio; «proxima» pasa a «programada»
--   · documentos        → archivos de las actividades a las que estaban ligados;
--                         cada documento suelto, a una actividad «Publicación de
--                         producto técnico» propia
--   · actividad_fotos   → archivos «Fotografía» de su actividad
--   · reuniones         → actividades «Reunión técnica»
--   · poel_sesiones     → actividades según su categoría (+ sus archivos)
--   · avisos            → actividades con su aviso configurado
--
-- Publicación: lo que ya se veía en el portal sigue publicado. Lo que el portal
-- nunca mostró —los avisos, que eran internos del panel, y las reuniones ya
-- pasadas— entra como BORRADOR, para que nada salga al público sin que alguien
-- lo revise primero.
--
-- Se conservan los ids: un enlace viejo a una foto o a un documento resuelve al
-- mismo archivo, y los indicadores siguen apuntando a su documento de respaldo.
-- Si dos tablas viejas comparten un id (solo pasa con datos importados o
-- capturados a mano), la segunda fila se copia con un id nuevo y deja una
-- advertencia «Migración 002» en el log del backend: nada se pierde en silencio.
--
-- Los textos quedan como los deja el formulario: nombres, lugares y
-- direcciones en una sola línea, y los nombres recortados a su límite con «…»
-- (salen en tarjetas, en la franja de avisos y en el asunto del correo). El
-- panel viejo no tenía límites; los textos largos se quedan completos.
--
-- Las tablas viejas NO se borran: quedan como respaldo y el código deja de
-- usarlas (ver DEPLOY.md). `actividades` es la única que se convierte en su
-- sitio, así que antes se copia tal cual a `actividades_v1`.
--
-- Escenarios:
--   · volumen nuevo → todavía no existe `users`: no hace nada (schema.sql crea
--     el modelo nuevo directamente)
--   · base anterior → respalda, amplía, convierte y copia
--   · base ya convertida → `actividades` ya tiene `publicacion`: no hace nada.
--     Así es idempotente sin ON CONFLICT, que ocultaba los choques de ids.
-- Corre dentro de una transacción (ver migrate.ts): si algo falla, la base
-- queda intacta y el backend no arranca, con el error de Postgres en el log.
--
-- Las columnas opcionales de las tablas viejas (las que schema.sql fue
-- añadiendo con el tiempo) se leen con `to_jsonb(fila) ->> 'columna'`, que da
-- NULL en vez de fallar cuando la columna no existe en una base más antigua.

-- ── Ayudantes (en pg_temp; se borran al final del archivo) ─────────────────

-- Id para una fila que llega de una tabla vieja: el suyo, salvo que `destino`
-- ya lo use. Entonces recibe uno nuevo y queda la advertencia en el log.
CREATE OR REPLACE FUNCTION pg_temp.id_libre(destino regclass, viejo uuid, origen text)
RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE
  usado boolean;
  nuevo uuid;
BEGIN
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE id = $1)', destino) INTO usado USING viejo;
  IF NOT usado THEN
    RETURN viejo;
  END IF;
  nuevo := gen_random_uuid();
  RAISE WARNING 'Migración 002: el id % de % ya estaba en uso en %; se copió con el id %',
    viejo, origen, destino, nuevo;
  RETURN nuevo;
END
$f$;

-- Los espacios que reconocen `\s` y `trim()` en JavaScript, para una clase
-- `[...]`: el [:space:] de POSIX no incluye el de no separación (U+00A0) ni
-- varios otros de Unicode.
CREATE OR REPLACE FUNCTION pg_temp.espacios() RETURNS text
LANGUAGE sql AS $f$
  SELECT '[:space:]\xa0\x1680\x2000-\x200a\x2028\x2029\x202f\x205f\x3000\xfeff'
$f$;

-- Como `linea()` del formulario: una sola línea, sin caracteres de control.
CREATE OR REPLACE FUNCTION pg_temp.linea(texto text) RETURNS text
LANGUAGE sql AS $f$
  SELECT btrim(regexp_replace(texto, '[[:cntrl:]' || pg_temp.espacios() || ']+', ' ', 'g'))
$f$;

-- Como `parrafos()`: conserva saltos de línea y tabuladores.
CREATE OR REPLACE FUNCTION pg_temp.parrafos(texto text) RETURNS text
LANGUAGE sql AS $f$
  SELECT regexp_replace(
    regexp_replace(regexp_replace(texto, '\r\n?', E'\n', 'g'), '[\x01-\x08\x0b-\x1f\x7f]', '', 'g'),
    '^[' || pg_temp.espacios() || ']+|[' || pg_temp.espacios() || ']+$', '', 'g')
$f$;

-- Recorta a `largo` caracteres; si sobra texto, termina en «…».
CREATE OR REPLACE FUNCTION pg_temp.recortar(texto text, largo int) RETURNS text
LANGUAGE sql AS $f$
  SELECT CASE WHEN length(texto) <= largo THEN texto ELSE rtrim(left(texto, largo - 1)) || '…' END
$f$;

DO $$
DECLARE
  hoy date := (now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'actividades' AND column_name = 'publicacion'
  ) THEN
    RAISE NOTICE 'Migración 002: actividades ya tiene el modelo nuevo; no hay nada que convertir';
    RETURN;
  END IF;

  -- 0 · respaldo de la única tabla que se convierte en su sitio ────────────
  IF to_regclass('public.actividades') IS NOT NULL THEN
    CREATE TABLE actividades_v1 AS TABLE actividades;
  END IF;

  -- 1 · actividades: crear (base anterior al portal) o ampliar ─────────────
  CREATE TABLE IF NOT EXISTS actividades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo      TEXT NOT NULL,
    fecha       DATE NOT NULL,
    hora_inicio TEXT NOT NULL DEFAULT '',
    hora_fin    TEXT NOT NULL DEFAULT '',
    lugar       TEXT NOT NULL DEFAULT '',
    descripcion TEXT NOT NULL DEFAULT '',
    estado      TEXT NOT NULL DEFAULT 'programada',
    resultados  TEXT NOT NULL DEFAULT '',
    creado_por  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_actividades_fecha  ON actividades (fecha DESC);
  CREATE INDEX IF NOT EXISTS idx_actividades_estado ON actividades (estado);

  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS fase              TEXT NOT NULL DEFAULT 'Formulación';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS tipo              TEXT NOT NULL DEFAULT 'Otra';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS direccion         TEXT NOT NULL DEFAULT '';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS latitud           TEXT NOT NULL DEFAULT '';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS longitud          TEXT NOT NULL DEFAULT '';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS acuerdos          TEXT NOT NULL DEFAULT '';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS publicacion       TEXT NOT NULL DEFAULT 'publicado';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS aviso_activo      BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS aviso_titulo      TEXT NOT NULL DEFAULT '';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS aviso_descripcion TEXT NOT NULL DEFAULT '';
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS aviso_inicio      DATE;
  ALTER TABLE actividades ADD COLUMN IF NOT EXISTS aviso_fin         DATE;

  -- El CHECK viejo solo admitía proxima/realizada/cancelada.
  ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_estado_check;
  UPDATE actividades SET estado = 'programada' WHERE estado = 'proxima';
  ALTER TABLE actividades ALTER COLUMN estado SET DEFAULT 'programada';

  -- Las actividades que ya existían no tenían tipo: se deduce de su nombre, y
  -- lo que no encaje queda como «Otra» para que el admin lo corrija.
  UPDATE actividades SET tipo = CASE
      WHEN titulo ILIKE '%cabildo%'  THEN 'Sesión de Cabildo'
      WHEN titulo ILIKE '%consejo%'  THEN 'Sesión del Consejo'
      WHEN titulo ILIKE '%comit%'    THEN 'Sesión del Comité'
      WHEN titulo ILIKE '%foro%'     THEN 'Foro'
      WHEN titulo ILIKE '%taller%'   THEN 'Taller'
      WHEN titulo ILIKE '%mesa%'     THEN 'Mesa de trabajo'
      WHEN titulo ILIKE '%consulta%' THEN 'Consulta pública'
      ELSE 'Otra'
    END
  WHERE tipo = 'Otra';

  -- 2 · archivos de actividades ─────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS actividad_archivos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actividad_id    UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL DEFAULT 'Otro',
    titulo          TEXT NOT NULL DEFAULT '',
    nombre_original TEXT NOT NULL,
    mime            TEXT NOT NULL,
    size            BIGINT NOT NULL DEFAULT 0,
    ruta_local      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_actividad_archivos_actividad ON actividad_archivos (actividad_id);

  -- 3 · repositorio de documentos ─────────────────────────────────────────
  -- Va antes que cualquier otro archivo: con la tabla todavía vacía, cada
  -- documento conserva su id, que es al que apuntan los indicadores.
  IF to_regclass('public.documentos') IS NOT NULL THEN
    -- Ligados a actividades: una copia por actividad. La primera conserva el id
    -- del documento, que es el que aparecía en los enlaces de descarga.
    IF to_regclass('public.actividad_documentos') IS NOT NULL THEN
      INSERT INTO actividad_archivos (id, actividad_id, tipo, titulo, nombre_original, mime, size, ruta_local, created_at)
      SELECT CASE WHEN l.orden = 1 THEN d.id ELSE gen_random_uuid() END,
             l.actividad_id,
             CASE d.tipo
               WHEN 'Convocatorias'   THEN 'Convocatoria'
               WHEN 'Actas y minutas' THEN 'Acta'
               WHEN 'Acuerdos'        THEN 'Acuerdo'
               ELSE 'Otro'
             END,
             d.titulo, d.nombre_original, d.mime, d.size, d.ruta_local, d.created_at
      FROM (
        SELECT actividad_id, documento_id,
               row_number() OVER (PARTITION BY documento_id ORDER BY actividad_id) AS orden
        FROM actividad_documentos
      ) l
      JOIN documentos d ON d.id = l.documento_id;
    END IF;

    -- Sueltos: cada uno pasa a ser la publicación de un producto técnico, que
    -- es lo que era (se publicó un documento del proceso).
    CREATE TEMP TABLE _documentos_sueltos ON COMMIT DROP AS
      SELECT d.*, gen_random_uuid() AS nueva_actividad_id
      FROM documentos d
      WHERE NOT EXISTS (SELECT 1 FROM actividad_archivos a WHERE a.id = d.id);

    INSERT INTO actividades (id, titulo, fase, tipo, estado, fecha, descripcion, publicacion,
                             creado_por, created_at, updated_at)
    SELECT s.nueva_actividad_id, s.titulo, 'Formulación', 'Publicación de producto técnico',
           'realizada',
           COALESCE(s.fecha, (s.created_at AT TIME ZONE 'America/Mexico_City')::date),
           s.descripcion, 'publicado', s.creado_por, s.created_at, s.updated_at
    FROM _documentos_sueltos s;

    INSERT INTO actividad_archivos (id, actividad_id, tipo, titulo, nombre_original, mime, size, ruta_local, created_at)
    SELECT s.id, s.nueva_actividad_id,
           CASE s.tipo
             WHEN 'Convocatorias'   THEN 'Convocatoria'
             WHEN 'Actas y minutas' THEN 'Acta'
             WHEN 'Acuerdos'        THEN 'Acuerdo'
             ELSE 'Otro'
           END,
           s.titulo, s.nombre_original, s.mime, s.size, s.ruta_local, s.created_at
    FROM _documentos_sueltos s;
  END IF;

  -- 4 · fotos de actividades ──────────────────────────────────────────────
  IF to_regclass('public.actividad_fotos') IS NOT NULL THEN
    INSERT INTO actividad_archivos (id, actividad_id, tipo, nombre_original, mime, size, ruta_local, created_at)
    SELECT pg_temp.id_libre('actividad_archivos', f.id, 'actividad_fotos'), f.actividad_id,
           'Fotografía', f.nombre_original, f.mime, f.size, f.ruta_local, f.created_at
    FROM actividad_fotos f;
  END IF;

  -- 5 · reuniones ─────────────────────────────────────────────────────────
  -- El portal solo mostraba las futuras: las pasadas nunca fueron públicas.
  IF to_regclass('public.reuniones') IS NOT NULL THEN
    INSERT INTO actividades (id, titulo, fase, tipo, estado, fecha, hora_inicio, hora_fin,
                             publicacion, creado_por, created_at, updated_at)
    SELECT pg_temp.id_libre('actividades', r.id, 'reuniones'), r.titulo, 'Formulación',
           'Reunión técnica',
           CASE WHEN r.fecha >= hoy THEN 'programada' ELSE 'realizada' END,
           r.fecha, r.hora_inicio, r.hora_fin,
           CASE WHEN r.fecha >= hoy THEN 'publicado' ELSE 'borrador' END,
           r.creado_por, r.created_at, r.created_at
    FROM reuniones r;
  END IF;

  -- 6 · sesiones POEL ─────────────────────────────────────────────────────
  IF to_regclass('public.poel_sesiones') IS NOT NULL THEN
    -- Id de cada sesión en `actividades`: sus archivos la siguen aunque haya
    -- recibido uno nuevo.
    CREATE TEMP TABLE _sesiones ON COMMIT DROP AS
      SELECT s.id AS viejo, pg_temp.id_libre('actividades', s.id, 'poel_sesiones') AS nuevo
      FROM poel_sesiones s;

    INSERT INTO actividades (id, titulo, fase, tipo, estado, fecha, lugar, direccion, latitud,
                             longitud, descripcion, publicacion, created_at, updated_at)
    SELECT m.nuevo, s.titulo, 'Formulación',
           CASE
             WHEN s.categoria ILIKE '%comit%'       THEN 'Sesión del Comité'
             WHEN s.categoria ILIKE '%taller%'      THEN 'Taller'
             WHEN s.categoria ILIKE '%consulta%'    THEN 'Consulta pública'
             WHEN s.categoria ILIKE '%foro%'        THEN 'Foro'
             WHEN s.categoria ILIKE '%presentaci%'  THEN 'Presentación'
             ELSE 'Otra'
           END,
           CASE WHEN s.fecha IS NOT NULL AND s.fecha >= hoy THEN 'programada' ELSE 'realizada' END,
           COALESCE(s.fecha, (s.created_at AT TIME ZONE 'America/Mexico_City')::date),
           -- `ubicacion` admitía la dirección escrita o un enlace de Maps pegado.
           CASE WHEN s.ubicacion ~* '^https?://' THEN '' ELSE s.ubicacion END,
           CASE WHEN s.ubicacion ~* '^https?://' THEN s.ubicacion ELSE '' END,
           COALESCE(to_jsonb(s) ->> 'latitud', ''),
           COALESCE(to_jsonb(s) ->> 'longitud', ''),
           s.descripcion,
           CASE WHEN s.activo THEN 'publicado' ELSE 'oculto' END,
           s.created_at,
           COALESCE((to_jsonb(s) ->> 'updated_at')::timestamptz, s.created_at)
    FROM poel_sesiones s
    JOIN _sesiones m ON m.viejo = s.id;

    IF to_regclass('public.poel_archivos') IS NOT NULL THEN
      INSERT INTO actividad_archivos (id, actividad_id, tipo, nombre_original, mime, size, ruta_local, created_at)
      SELECT pg_temp.id_libre('actividad_archivos', a.id, 'poel_archivos'), m.nuevo,
             CASE WHEN a.tipo = 'imagen' THEN 'Fotografía' ELSE 'Otro' END,
             a.nombre_original, a.mime, a.size, a.ruta_local, a.created_at
      FROM poel_archivos a
      JOIN _sesiones m ON m.viejo = a.sesion_id;
    END IF;

    -- La imagen única de versiones anteriores, si no llegó a poel_archivos.
    INSERT INTO actividad_archivos (actividad_id, tipo, nombre_original, mime, size, ruta_local)
    SELECT m.nuevo, 'Fotografía',
           COALESCE(NULLIF(to_jsonb(s) ->> 'imagen_nombre', ''), 'imagen'),
           COALESCE(NULLIF(to_jsonb(s) ->> 'imagen_mime', ''), 'application/octet-stream'),
           0, to_jsonb(s) ->> 'imagen_ruta'
    FROM poel_sesiones s
    JOIN _sesiones m ON m.viejo = s.id
    WHERE COALESCE(to_jsonb(s) ->> 'imagen_ruta', '') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM actividad_archivos a
        WHERE a.actividad_id = m.nuevo AND a.ruta_local = to_jsonb(s) ->> 'imagen_ruta'
      );
  END IF;

  -- 7 · avisos ────────────────────────────────────────────────────────────
  -- Eran internos del panel: entran como borrador, con el aviso ya vencido
  -- (vigencia de un solo día, el de su publicación) para que no reaparezca en
  -- la portada si alguien publica la actividad sin revisar sus fechas.
  IF to_regclass('public.avisos') IS NOT NULL THEN
    INSERT INTO actividades (id, titulo, fase, tipo, estado, fecha, descripcion, publicacion,
                             aviso_activo, aviso_titulo, aviso_descripcion, aviso_inicio, aviso_fin,
                             creado_por, created_at, updated_at)
    SELECT pg_temp.id_libre('actividades', a.id, 'avisos'), a.titulo, 'Formulación', 'Otra',
           'realizada',
           (a.created_at AT TIME ZONE 'America/Mexico_City')::date,
           a.descripcion, 'borrador',
           a.activo, a.titulo, a.descripcion,
           (a.created_at AT TIME ZONE 'America/Mexico_City')::date,
           (a.created_at AT TIME ZONE 'America/Mexico_City')::date,
           a.creado_por, a.created_at,
           COALESCE((to_jsonb(a) ->> 'updated_at')::timestamptz, a.created_at)
    FROM avisos a;
  END IF;

  -- 8 · textos como los deja el formulario (límites de validarActividad) ───
  UPDATE actividades SET
    titulo            = COALESCE(NULLIF(pg_temp.recortar(pg_temp.linea(titulo), 300), ''),
                                 'Actividad sin nombre'),
    aviso_titulo      = pg_temp.recortar(pg_temp.linea(aviso_titulo), 200),
    lugar             = pg_temp.linea(lugar),
    direccion         = pg_temp.linea(direccion),
    descripcion       = pg_temp.parrafos(descripcion),
    resultados        = pg_temp.parrafos(resultados),
    acuerdos          = pg_temp.parrafos(acuerdos),
    aviso_descripcion = pg_temp.recortar(pg_temp.parrafos(aviso_descripcion), 500);
  UPDATE actividad_archivos SET titulo = pg_temp.recortar(pg_temp.linea(titulo), 300);

  -- 9 · restricciones con nombre fijo (las mismas que declara schema.sql) ──
  -- Van al final: si alguna fila copiada no cumple, la migración entera se
  -- revierte en vez de dejar datos a medias.
  ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_fase_check;
  ALTER TABLE actividades ADD CONSTRAINT actividades_fase_check CHECK (fase IN (
    'Formulación','Expedición','Ejecución','Evaluación','Modificación'));

  ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_tipo_check;
  ALTER TABLE actividades ADD CONSTRAINT actividades_tipo_check CHECK (tipo IN (
    'Sesión del Comité','Sesión del Consejo','Sesión de Cabildo','Foro','Taller',
    'Mesa de trabajo','Reunión técnica','Presentación','Consulta pública',
    'Firma de convenio','Aprobación','Publicación de producto técnico','Otra'));

  ALTER TABLE actividades ADD CONSTRAINT actividades_estado_check CHECK (estado IN (
    'programada','realizada','reprogramada','cancelada'));

  ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_publicacion_check;
  ALTER TABLE actividades ADD CONSTRAINT actividades_publicacion_check CHECK (publicacion IN (
    'borrador','publicado','oculto'));

  ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_aviso_vigencia_check;
  ALTER TABLE actividades ADD CONSTRAINT actividades_aviso_vigencia_check CHECK (
    NOT aviso_activo
    OR (aviso_inicio IS NOT NULL AND aviso_fin IS NOT NULL AND aviso_fin >= aviso_inicio));

  ALTER TABLE actividad_archivos DROP CONSTRAINT IF EXISTS actividad_archivos_tipo_check;
  ALTER TABLE actividad_archivos ADD CONSTRAINT actividad_archivos_tipo_check CHECK (tipo IN (
    'Convocatoria','Orden del día','Acta','Acuerdo','Lista de asistencia','Presentación',
    'Dictamen','Documento aprobado','Fotografía','Otro'));

  -- 10 · indicadores: el respaldo pasa a ser un archivo de actividad ───────
  -- Los ids de los documentos se conservaron arriba, así que cada indicador
  -- sigue apuntando al mismo archivo; solo cambia la tabla de la llave foránea.
  IF to_regclass('public.indicadores') IS NOT NULL THEN
    ALTER TABLE indicadores DROP CONSTRAINT IF EXISTS indicadores_documento_respaldo_id_fkey;
    UPDATE indicadores i SET documento_respaldo_id = NULL
    WHERE i.documento_respaldo_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM actividad_archivos a WHERE a.id = i.documento_respaldo_id);
    ALTER TABLE indicadores ADD CONSTRAINT indicadores_documento_respaldo_id_fkey
      FOREIGN KEY (documento_respaldo_id) REFERENCES actividad_archivos(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP FUNCTION pg_temp.id_libre(regclass, uuid, text);
DROP FUNCTION pg_temp.linea(text);
DROP FUNCTION pg_temp.parrafos(text);
DROP FUNCTION pg_temp.espacios();
DROP FUNCTION pg_temp.recortar(text, int);
