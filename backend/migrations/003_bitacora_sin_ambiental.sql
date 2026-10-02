-- Migración 003: el portal se llama «Bitácora», ya no «Bitácora Ambiental».
--
-- Los textos por defecto del código ya cambiaron, pero lo que el panel de
-- «Personalización» guardó antes vive en `site_customizations.config` y seguiría
-- mostrando el nombre anterior. Esta migración actualiza esos textos guardados.
--
-- Primero las frases compuestas, para que la oración siga leyéndose bien
-- («Bitácora Ambiental y de Ordenamiento Territorial» → «Bitácora de
-- Ordenamiento Territorial»); después el nombre suelto. El historial de
-- auditoría (`customization_audit_logs`) no se toca: es el registro de lo que
-- se guardó en su momento.
--
-- Idempotente: sin coincidencias no cambia nada, así que puede repetirse. En un
-- volumen nuevo todavía no existe la tabla (la crea schema.sql): no hace nada.

DO $$
BEGIN
  IF to_regclass('public.site_customizations') IS NULL THEN
    RETURN;
  END IF;

  UPDATE site_customizations
  SET config = replace(
                 replace(
                   replace(
                     replace(
                       replace(
                         replace(config::text,
                           'BITÁCORA AMBIENTAL Y ORDENAMIENTO TERRITORIAL', 'BITÁCORA DE ORDENAMIENTO TERRITORIAL'),
                         'Bitácora Ambiental y de Ordenamiento Territorial', 'Bitácora de Ordenamiento Territorial'),
                       'Bitácora Ambiental y Ordenamiento Territorial', 'Bitácora de Ordenamiento Territorial'),
                     'BITÁCORA AMBIENTAL', 'BITÁCORA'),
                   'Bitácora Ambiental', 'Bitácora'),
                 'Bitácora ambiental', 'Bitácora')::jsonb
  WHERE config::text ~ '(Bitácora|BITÁCORA) (Ambiental|ambiental|AMBIENTAL)';
END
$$;
