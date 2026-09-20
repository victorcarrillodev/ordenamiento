-- seed-portal.sql — datos demo de «Actividades y avances del Programa»
-- (idempotente, ejecutable con psql -f). Limpia solo las tablas del portal; no
-- toca participations ni users.
--
-- Los archivos apuntan a rutas de ejemplo (seed/...) que no existen en disco:
-- sirven para ver listas y fichas, no para descargarlos.

DELETE FROM mediciones;
DELETE FROM indicadores;
DELETE FROM actividad_archivos;
DELETE FROM actividades;

-- ── Actividades: 2 programadas (una con aviso vigente) y 2 realizadas ───────
INSERT INTO actividades (id, titulo, fase, tipo, estado, fecha, hora_inicio, hora_fin, lugar,
                         descripcion, resultados, acuerdos, publicacion,
                         aviso_activo, aviso_titulo, aviso_descripcion, aviso_inicio, aviso_fin) VALUES
  ('11111111-1111-4111-a111-111111111111', 'Taller de diagnóstico participativo', 'Formulación',
   'Taller', 'programada', CURRENT_DATE + 14, '10:00', '13:00', 'Casa de la Cultura, Centro',
   'Diagnóstico del territorio con actores locales.', '', '', 'publicado',
   false, '', '', NULL, NULL),
  ('11111111-1111-4111-a111-111111111112', 'Foro abierto POETDUM', 'Formulación',
   'Consulta pública', 'programada', CURRENT_DATE + 30, '09:00', '15:00', 'Auditorio Municipal',
   'Presentación de avances y recepción de propuestas.', '', '', 'publicado',
   true, 'Apertura de la consulta pública', 'Participa en el foro abierto y presenta tus propuestas.',
   CURRENT_DATE, CURRENT_DATE + 30),
  ('11111111-1111-4111-a111-111111111113', 'Recorrido de campo Zona Sur', 'Formulación',
   'Reunión técnica', 'realizada', CURRENT_DATE - 10, '08:00', '12:00', 'Ejido La Primavera',
   'Verificación en campo de usos de suelo.',
   'Se identificaron 12 polígonos con cambio de uso.', 'Minuta firmada por 18 asistentes.',
   'publicado', false, '', '', NULL, NULL),
  ('11111111-1111-4111-a111-111111111114', 'Firma del convenio marco POETDUM 2026', 'Formulación',
   'Firma de convenio', 'realizada', CURRENT_DATE - 60, '11:00', '', 'Palacio Municipal',
   'Convenio entre el municipio y el estado para elaborar el Programa.', 'Convenio firmado.', '',
   'publicado', false, '', '', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Archivos de las actividades ─────────────────────────────────────────────
INSERT INTO actividad_archivos (id, actividad_id, tipo, titulo, nombre_original, mime, size, ruta_local) VALUES
  ('22222222-2222-4222-a222-222222222221', '11111111-1111-4111-a111-111111111114', 'Documento aprobado',
   'Convenio marco POETDUM 2026', 'convenio-marco.pdf', 'application/pdf', 102400, 'seed/convenio-marco.pdf'),
  ('22222222-2222-4222-a222-222222222222', '11111111-1111-4111-a111-111111111111', 'Convocatoria',
   'Convocatoria al taller', 'convocatoria-taller.pdf', 'application/pdf', 51200, 'seed/convocatoria-taller.pdf'),
  ('22222222-2222-4222-a222-222222222223', '11111111-1111-4111-a111-111111111113', 'Acta',
   'Minuta del recorrido', 'minuta-recorrido.pdf', 'application/pdf', 76800, 'seed/minuta-recorrido.pdf'),
  ('22222222-2222-4222-a222-222222222224', '11111111-1111-4111-a111-111111111112', 'Convocatoria',
   'Convocatoria al foro abierto', 'convocatoria-foro.pdf', 'application/pdf', 32000, 'seed/convocatoria-foro.pdf'),
  ('22222222-2222-4222-a222-222222222225', '11111111-1111-4111-a111-111111111113', 'Otro',
   'Cartografía base 1:50k', 'cartografia-base.zip', 'application/zip', 2048000, 'seed/cartografia-base.zip')
ON CONFLICT (id) DO NOTHING;

-- ── Indicadores (Seguimiento y evaluación) ──────────────────────────────────
INSERT INTO indicadores (id, nombre, descripcion, unidad, meta, fecha_evaluacion, resultado_texto, documento_respaldo_id) VALUES
  ('33333333-3333-4333-a333-333333333331', 'Hectáreas bajo manejo sustentable', 'Superficie incorporada a manejo sustentable', 'ha', 5000, '2026-12-31', '', '22222222-2222-4222-a222-222222222225'),
  ('33333333-3333-4333-a333-333333333332', 'Talleres participativos realizados', 'Número de talleres con acta firmada', 'talleres', NULL, '', '12 talleres realizados; 240 participantes en total', NULL),
  ('33333333-3333-4333-a333-333333333333', 'Avance del programa', 'Porcentaje de avance en la elaboración', '%', 100, '2026-09-30', '', '22222222-2222-4222-a222-222222222221')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mediciones (indicador_id, periodo, valor) VALUES
  ('33333333-3333-4333-a333-333333333331', '2026-T1', 800),
  ('33333333-3333-4333-a333-333333333331', '2026-T2', 1450),
  ('33333333-3333-4333-a333-333333333331', '2026-T3', 2100),
  ('33333333-3333-4333-a333-333333333333', '2026-01', 15),
  ('33333333-3333-4333-a333-333333333333', '2026-02', 35)
ON CONFLICT DO NOTHING;
