-- Migración 001: BIGINT GENERATED ALWAYS AS IDENTITY → UUID gen_random_uuid()
--
-- Hasta c0e7c04 el esquema usaba BIGINT como PK. `schema.sql` pasó a UUID, pero
-- las bases ya desplegadas se quedaron en BIGINT porque nada ejecutaba este
-- directorio (`migrate.ts` solo leía schema.sql y el Dockerfile ni siquiera
-- copiaba `migrations/`). El síntoma es que toda tabla nueva que declare
-- `REFERENCES <tabla_vieja>(id)` como UUID revienta con 42804
-- («incompatible types: uuid and bigint») y tumba el arranque del backend.
--
-- Idempotente por construcción:
--   · volumen nuevo  → las tablas no existen todavía, cada guarda falla, no hace nada
--   · base ya en UUID → no hay columnas `*_uuid` intermedias, no hace nada
--   · base en BIGINT  → convierte, remapeando las FKs por su valor viejo
--
-- Corre entera dentro de una transacción: si algo falla, la base queda intacta.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- `search_history` se retiró en la auditoría H3 (tabla muerta: ni lecturas ni
-- escrituras en el código). `schema.sql` ya no la crea; se elimina aquí de las
-- bases viejas, y de paso desaparece su FK a users, que estorbaría abajo.
DROP TABLE IF EXISTS search_history;

-- ---------------------------------------------------------------------------
-- Fase 1 · Una columna UUID nueva por cada PK que siga en BIGINT.
-- El DEFAULT es volátil, así que Postgres genera un valor distinto por fila.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'participations', 'attachments', 'reuniones', 'avisos',
    'poel_sesiones', 'customization_audit_logs'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t
        AND column_name = 'id' AND data_type = 'bigint'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid()', t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 2 · Remapear cada FK BIGINT al UUID recién generado de su tabla destino.
-- Se hace ANTES de tocar las PKs: mientras el `id` viejo siga en pie, el JOIN
-- todavía puede traducir el valor antiguo al nuevo.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('participations',           'creado_por',       'users'),
    ('participations',           'resuelto_por',     'users'),
    ('attachments',              'participation_id', 'participations'),
    ('reuniones',                'creado_por',       'users'),
    ('avisos',                   'creado_por',       'users'),
    ('customization_audit_logs', 'user_id',          'users'),
    ('site_customizations',      'updated_by',       'users')
  ) AS v(tbl, col, ref) LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = r.tbl
          AND column_name = r.col AND data_type = 'bigint'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = r.ref AND column_name = 'id_uuid'
      )
    THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN %I UUID', r.tbl, r.col || '_uuid');
      EXECUTE format(
        'UPDATE %I hijo SET %I = padre.id_uuid FROM %I padre WHERE padre.id = hijo.%I',
        r.tbl, r.col || '_uuid', r.ref, r.col
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 3 · Retirar las FKs que apuntan a una tabla en conversión.
-- El nombre de la constraint varía según cómo se creó la tabla, así que se
-- descubren en pg_constraint en vez de adivinarlos. Solo se tocan las que
-- apuntan a tablas con `id_uuid`: sobre una base ya migrada, no hay ninguna.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = c.confrelid::regclass::text
          AND col.column_name = 'id_uuid'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 4 · Cambiar cada PK por su columna UUID.
-- `DROP COLUMN id` se lleva por delante la secuencia de identidad y los
-- índices que colgaban de ella; schema.sql los recrea con IF NOT EXISTS.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'participations', 'attachments', 'reuniones', 'avisos',
    'poel_sesiones', 'customization_audit_logs'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'id_uuid'
    ) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_pkey');
      EXECUTE format('ALTER TABLE %I DROP COLUMN id', t);
      EXECUTE format('ALTER TABLE %I RENAME COLUMN id_uuid TO id', t);
      EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (id)', t);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 5 · Sustituir cada columna FK vieja por su equivalente UUID.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('participations',           'creado_por'),
    ('participations',           'resuelto_por'),
    ('attachments',              'participation_id'),
    ('reuniones',                'creado_por'),
    ('avisos',                   'creado_por'),
    ('customization_audit_logs', 'user_id'),
    ('site_customizations',      'updated_by')
  ) AS v(tbl, col) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl
        AND column_name = r.col || '_uuid'
    ) THEN
      EXECUTE format('ALTER TABLE %I DROP COLUMN %I', r.tbl, r.col);
      EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', r.tbl, r.col || '_uuid', r.col);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 6 · Recrear las FKs con el mismo ON DELETE que declara schema.sql.
-- Un adjunto sin participación viva ya estaba huérfano antes de migrar (su
-- FK era CASCADE), así que se descarta en vez de bloquear el NOT NULL.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  IF to_regclass('public.attachments') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attachments'
      AND column_name = 'participation_id' AND data_type = 'uuid'
  ) THEN
    DELETE FROM attachments WHERE participation_id IS NULL;
    ALTER TABLE attachments ALTER COLUMN participation_id SET NOT NULL;
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('participations',           'creado_por',       'users',          'SET NULL'),
    ('participations',           'resuelto_por',     'users',          'SET NULL'),
    ('attachments',              'participation_id', 'participations', 'CASCADE'),
    ('reuniones',                'creado_por',       'users',          'SET NULL'),
    ('avisos',                   'creado_por',       'users',          'SET NULL'),
    ('customization_audit_logs', 'user_id',          'users',          'SET NULL'),
    ('site_customizations',      'updated_by',       'users',          'SET NULL')
  ) AS v(tbl, col, ref, on_delete) LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL
      AND to_regclass('public.' || r.ref) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = r.tbl
          AND column_name = r.col AND data_type = 'uuid'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND conname = r.tbl || '_' || r.col || '_fkey'
          AND connamespace = 'public'::regnamespace
      )
    THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE %s',
        r.tbl, r.tbl || '_' || r.col || '_fkey', r.col, r.ref, r.on_delete
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
