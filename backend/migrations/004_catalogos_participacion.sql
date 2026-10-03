-- Migración 004: catálogos del formulario de participación.
--
-- Las listas de temática, tipo de participante y género cambiaron de nombre
-- (mayúsculas, «del» en vez de «de», opciones nuevas). Lo ya registrado se lleva
-- a los nombres nuevos para que las estadísticas no cuenten dos veces la misma
-- opción y los filtros del panel sigan encontrándola.
--
--   temática           «Servicios Ambientales»  → «Servicios ambientales»
--                      «Gestión del Agua»       → «Gestión del agua»
--                      «Gestión de Riesgo»      → «Gestión del riesgo»
--                      «Desarrollo urbano y gestión de suelo» → «… del suelo»
--                      «Gestión de Residuos»    → «Gestión de residuos»
--   tipo participante  «Persona ciudadana»      → «Persona a título individual»
--                      «Dependencia»            → «Organismo público»
--                      «Organización»           → «Organización civil»
--   género             «Otro»                   → «Otra identidad de género»
--
-- Idempotente: sin coincidencias no cambia nada. En un volumen nuevo todavía no
-- existe la tabla (la crea schema.sql): no hace nada.

DO $$
BEGIN
  IF to_regclass('public.participations') IS NULL THEN
    RETURN;
  END IF;

  UPDATE participations SET tematica = CASE tematica
    WHEN 'Servicios Ambientales' THEN 'Servicios ambientales'
    WHEN 'Gestión del Agua' THEN 'Gestión del agua'
    WHEN 'Gestión de Riesgo' THEN 'Gestión del riesgo'
    WHEN 'Desarrollo urbano y gestión de suelo' THEN 'Desarrollo urbano y gestión del suelo'
    WHEN 'Gestión de Residuos' THEN 'Gestión de residuos'
  END
  WHERE tematica IN ('Servicios Ambientales', 'Gestión del Agua', 'Gestión de Riesgo',
                     'Desarrollo urbano y gestión de suelo', 'Gestión de Residuos');

  UPDATE participations SET fuente = CASE fuente
    WHEN 'Persona ciudadana' THEN 'Persona a título individual'
    WHEN 'Dependencia' THEN 'Organismo público'
    WHEN 'Organización' THEN 'Organización civil'
  END
  WHERE fuente IN ('Persona ciudadana', 'Dependencia', 'Organización');

  UPDATE participations SET genero = 'Otra identidad de género' WHERE genero = 'Otro';
END
$$;
