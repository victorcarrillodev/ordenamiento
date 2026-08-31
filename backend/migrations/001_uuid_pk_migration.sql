-- Migración H1: BIGINT GENERATED ALWAYS AS IDENTITY → UUID gen_random_uuid()
-- Postgres 16, extensión pgcrypto para gen_random_uuid().
-- Diseñada para NO destruir datos existentes: genera UUID nuevos y remapea FKs.
-- Idempotente (IF NOT EXISTS / WHERE null), puede correrse sobre BD ya migrada sin efecto.
-- Para instalaciones nuevas (docker volume vacío) basta con `schema.sql` ya en UUID.
--
-- ORDEN: users primero (es raíz de FKs), luego participations, luego attachments/reuniones/avisos/poel/audit.
-- El folio TEXT UNIQUE se mantiene como identificador legible humano; UUID es PK interna y URL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- 1) users.id BIGINT → UUID
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    UPDATE users SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    -- Mantener temporalmente ambas columnas, mapear dependientes antes de swapear
  END IF;
END $$;

-- 2) participations.id + FKs a users
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participations' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE participations ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    ALTER TABLE participations ADD COLUMN IF NOT EXISTS creado_por_new UUID;
    ALTER TABLE participations ADD COLUMN IF NOT EXISTS resuelto_por_new UUID;
    UPDATE participations SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    -- Mapear FKs antiguos BIGINT → nuevos UUID de users
    UPDATE participations p SET creado_por_new = u.id_new FROM users u WHERE u.id = p.creado_por AND p.creado_por_new IS NULL;
    UPDATE participations p SET resuelto_por_new = u.id_new FROM users u WHERE u.id = p.resuelto_por AND p.resuelto_por_new IS NULL;
  END IF;
END $$;

-- 3) attachments.id + participation_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attachments' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE attachments ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    ALTER TABLE attachments ADD COLUMN IF NOT EXISTS participation_id_new UUID;
    UPDATE attachments SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    UPDATE attachments a SET participation_id_new = p.id_new FROM participations p WHERE p.id = a.participation_id AND a.participation_id_new IS NULL;
  END IF;
END $$;

-- 4) reuniones.id + creado_por
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reuniones' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS creado_por_new UUID;
    UPDATE reuniones SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    UPDATE reuniones r SET creado_por_new = u.id_new FROM users u WHERE u.id = r.creado_por AND r.creado_por_new IS NULL;
  END IF;
END $$;

-- 5) avisos.id + creado_por
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avisos' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE avisos ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    ALTER TABLE avisos ADD COLUMN IF NOT EXISTS creado_por_new UUID;
    UPDATE avisos SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    UPDATE avisos a SET creado_por_new = u.id_new FROM users u WHERE u.id = a.creado_por AND a.creado_por_new IS NULL;
  END IF;
END $$;

-- 6) poel_sesiones.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='poel_sesiones' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE poel_sesiones ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    UPDATE poel_sesiones SET id_new = gen_random_uuid() WHERE id_new IS NULL;
  END IF;
END $$;

-- 7) customization_audit_logs.id + user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customization_audit_logs' AND column_name='id' AND data_type='bigint') THEN
    ALTER TABLE customization_audit_logs ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
    ALTER TABLE customization_audit_logs ADD COLUMN IF NOT EXISTS user_id_new UUID;
    UPDATE customization_audit_logs SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    UPDATE customization_audit_logs l SET user_id_new = u.id_new FROM users u WHERE u.id = l.user_id AND l.user_id_new IS NULL;
  END IF;
END $$;

-- 8) site_customizations.updated_by (FK a users)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_customizations' AND column_name='updated_by' AND data_type='bigint') THEN
    ALTER TABLE site_customizations ADD COLUMN IF NOT EXISTS updated_by_new UUID;
    UPDATE site_customizations s SET updated_by_new = u.id_new FROM users u WHERE u.id = s.updated_by AND s.updated_by_new IS NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- Swapear columnas: solo si id_new existe (es decir, la tabla era BIGINT)
-- Se hace en orden inverso de dependencias para no romper FKs temporalmente.
-- Primero se dropean constraints, luego se renombran columnas, luego se recrean FKs.
-- ------------------------------------------------------------------

-- Helper para swapear PK: dropear PK antigua, renombrar id_new → id, recrear PK + default
-- Se usa bloque DO con EXCEPTION para ser idempotente si ya está en UUID.

-- users
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_new') THEN
    -- Dropear FKs que apuntan a users.id para poder cambiar PK
    ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_creado_por_fkey;
    ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_resuelto_por_fkey;
    ALTER TABLE reuniones DROP CONSTRAINT IF EXISTS reuniones_creado_por_fkey;
    ALTER TABLE avisos DROP CONSTRAINT IF EXISTS avisos_creado_por_fkey;
    ALTER TABLE customization_audit_logs DROP CONSTRAINT IF EXISTS customization_audit_logs_user_id_fkey;
    ALTER TABLE site_customizations DROP CONSTRAINT IF EXISTS site_customizations_updated_by_fkey;
    -- En Postgres 16 el nombre de FK puede variar; si no existe, el IF EXISTS lo ignora.
    -- También dropear dependencias de attachments si aún apuntan a participations
    ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_participation_id_fkey;

    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
    ALTER TABLE users RENAME COLUMN id TO id_old;
    ALTER TABLE users RENAME COLUMN id_new TO id;
    ALTER TABLE users ADD PRIMARY KEY (id);
    ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
    -- Dejar id_old temporalmente para debugging; se puede DROP tras verificar
  END IF;
END $$;

-- participations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participations' AND column_name='id_new') THEN
    ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_pkey;
    ALTER TABLE participations RENAME COLUMN id TO id_old;
    ALTER TABLE participations RENAME COLUMN id_new TO id;
    ALTER TABLE participations ADD PRIMARY KEY (id);
    ALTER TABLE participations ALTER COLUMN id SET DEFAULT gen_random_uuid();
    -- FKs a users (ahora UUID)
    ALTER TABLE participations RENAME COLUMN creado_por TO creado_por_old;
    ALTER TABLE participations RENAME COLUMN creado_por_new TO creado_por;
    ALTER TABLE participations RENAME COLUMN resuelto_por TO resuelto_por_old;
    ALTER TABLE participations RENAME COLUMN resuelto_por_new TO resuelto_por;
    -- Recrear FKs
    ALTER TABLE participations ADD CONSTRAINT participations_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE participations ADD CONSTRAINT participations_resuelto_por_fkey FOREIGN KEY (resuelto_por) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- attachments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attachments' AND column_name='id_new') THEN
    ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_pkey;
    ALTER TABLE attachments RENAME COLUMN id TO id_old;
    ALTER TABLE attachments RENAME COLUMN id_new TO id;
    ALTER TABLE attachments ADD PRIMARY KEY (id);
    ALTER TABLE attachments ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE attachments RENAME COLUMN participation_id TO participation_id_old;
    ALTER TABLE attachments RENAME COLUMN participation_id_new TO participation_id;
    ALTER TABLE attachments ADD CONSTRAINT attachments_participation_id_fkey FOREIGN KEY (participation_id) REFERENCES participations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_attachments_participation ON attachments (participation_id);
  END IF;
END $$;

-- reuniones
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reuniones' AND column_name='id_new') THEN
    ALTER TABLE reuniones DROP CONSTRAINT IF EXISTS reuniones_pkey;
    ALTER TABLE reuniones RENAME COLUMN id TO id_old;
    ALTER TABLE reuniones RENAME COLUMN id_new TO id;
    ALTER TABLE reuniones ADD PRIMARY KEY (id);
    ALTER TABLE reuniones ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE reuniones RENAME COLUMN creado_por TO creado_por_old;
    ALTER TABLE reuniones RENAME COLUMN creado_por_new TO creado_por;
    ALTER TABLE reuniones ADD CONSTRAINT reuniones_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- avisos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avisos' AND column_name='id_new') THEN
    ALTER TABLE avisos DROP CONSTRAINT IF EXISTS avisos_pkey;
    ALTER TABLE avisos RENAME COLUMN id TO id_old;
    ALTER TABLE avisos RENAME COLUMN id_new TO id;
    ALTER TABLE avisos ADD PRIMARY KEY (id);
    ALTER TABLE avisos ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE avisos RENAME COLUMN creado_por TO creado_por_old;
    ALTER TABLE avisos RENAME COLUMN creado_por_new TO creado_por;
    ALTER TABLE avisos ADD CONSTRAINT avisos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- poel_sesiones
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='poel_sesiones' AND column_name='id_new') THEN
    ALTER TABLE poel_sesiones DROP CONSTRAINT IF EXISTS poel_sesiones_pkey;
    ALTER TABLE poel_sesiones RENAME COLUMN id TO id_old;
    ALTER TABLE poel_sesiones RENAME COLUMN id_new TO id;
    ALTER TABLE poel_sesiones ADD PRIMARY KEY (id);
    ALTER TABLE poel_sesiones ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

-- customization_audit_logs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customization_audit_logs' AND column_name='id_new') THEN
    ALTER TABLE customization_audit_logs DROP CONSTRAINT IF EXISTS customization_audit_logs_pkey;
    ALTER TABLE customization_audit_logs RENAME COLUMN id TO id_old;
    ALTER TABLE customization_audit_logs RENAME COLUMN id_new TO id;
    ALTER TABLE customization_audit_logs ADD PRIMARY KEY (id);
    ALTER TABLE customization_audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE customization_audit_logs RENAME COLUMN user_id TO user_id_old;
    ALTER TABLE customization_audit_logs RENAME COLUMN user_id_new TO user_id;
    ALTER TABLE customization_audit_logs ADD CONSTRAINT customization_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- site_customizations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_customizations' AND column_name='updated_by_new') THEN
    ALTER TABLE site_customizations RENAME COLUMN updated_by TO updated_by_old;
    ALTER TABLE site_customizations RENAME COLUMN updated_by_new TO updated_by;
    ALTER TABLE site_customizations ADD CONSTRAINT site_customizations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Limpieza opcional de columnas *_old (descomentar tras verificar en prod que todo cuadra)
-- ALTER TABLE users DROP COLUMN IF EXISTS id_old;
-- ALTER TABLE participations DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS creado_por_old, DROP COLUMN IF EXISTS resuelto_por_old;
-- ALTER TABLE attachments DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS participation_id_old;
-- ALTER TABLE reuniones DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS creado_por_old;
-- ALTER TABLE avisos DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS creado_por_old;
-- ALTER TABLE poel_sesiones DROP COLUMN IF EXISTS id_old;
-- ALTER TABLE customization_audit_logs DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS user_id_old;
-- ALTER TABLE site_customizations DROP COLUMN IF EXISTS updated_by_old;

COMMIT;
