-- seed-portal.sql — datos demo POETDUM (idempotente, ejecutable con psql -f)
-- Limpia solo tablas del portal; no toca participations/users.

DELETE FROM mediciones;
DELETE FROM actividad_documentos;
DELETE FROM actividad_fotos;
DELETE FROM indicadores;
DELETE FROM documentos;
DELETE FROM actividades;

-- ── Actividades: 2 próximas (futuro), 1 realizada con resultados ──────────
INSERT INTO actividades (id, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion, estado, resultados) VALUES
  ('11111111-1111-4111-a111-111111111111', 'Taller de diagnóstico participativo', CURRENT_DATE + INTERVAL '14 days', '10:00', '13:00', 'Casa de la Cultura, Centro', 'Diagnóstico del territorio con actores locales.', 'proxima', ''),
  ('11111111-1111-4111-a111-111111111112', 'Foro abierto POETDUM', CURRENT_DATE + INTERVAL '30 days', '09:00', '15:00', 'Auditorio Municipal', 'Presentación de avances y recepción de propuestas.', 'proxima', ''),
  ('11111111-1111-4111-a111-111111111113', 'Recorrido de campo Zona Sur', CURRENT_DATE - INTERVAL '10 days', '08:00', '12:00', 'Ejido La Primavera', 'Verificación en campo de usos de suelo.', 'realizada', 'Se identificaron 12 polígonos con cambio de uso; minuta firmada por 18 asistentes.')
ON CONFLICT (id) DO NOTHING;

-- ── Documentos: 6 cubriendo varios de los 8 tipos ─────────────────────────
INSERT INTO documentos (id, titulo, tipo, etapa, fecha, descripcion, nombre_original, mime, size, ruta_local) VALUES
  ('22222222-2222-4222-a222-222222222221', 'Convenio marco POETDUM 2026', 'Convenios y anexos', 'En proceso', CURRENT_DATE - INTERVAL '60 days', 'Convenio entre municipio y estado.', 'convenio-marco.pdf', 'application/pdf', 102400, 'seed/convenio-marco.pdf'),
  ('22222222-2222-4222-a222-222222222222', 'Acuerdo de cabildo 04/2026', 'Acuerdos', 'Dictaminada', CURRENT_DATE - INTERVAL '45 days', 'Aprobación del programa de trabajo.', 'acuerdo-04-2026.pdf', 'application/pdf', 51200, 'seed/acuerdo-04-2026.pdf'),
  ('22222222-2222-4222-a222-222222222223', 'Acta primera sesión participativa', 'Actas y minutas', 'En proceso', CURRENT_DATE - INTERVAL '20 days', 'Acta de la primera sesión.', 'acta-sesion-1.pdf', 'application/pdf', 76800, 'seed/acta-sesion-1.pdf'),
  ('22222222-2222-4222-a222-222222222224', 'Convocatoria foro abierto', 'Convocatorias', 'En proceso', CURRENT_DATE - INTERVAL '5 days', 'Convocatoria pública al foro.', 'convocatoria-foro.pdf', 'application/pdf', 32000, 'seed/convocatoria-foro.pdf'),
  ('22222222-2222-4222-a222-222222222225', 'Cartografía base 1:50k', 'Cartografía', 'En proceso', CURRENT_DATE - INTERVAL '30 days', 'Mapa base del territorio.', 'cartografia-base.zip', 'application/zip', 2048000, 'seed/cartografia-base.zip'),
  ('22222222-2222-4222-a222-222222222226', 'Programa POETDUM versión preliminar', 'Programa', 'En proceso', CURRENT_DATE - INTERVAL '2 days', 'Documento programático preliminar.', 'programa-preliminar.pdf', 'application/pdf', 153600, 'seed/programa-preliminar.pdf')
ON CONFLICT (id) DO NOTHING;

-- Vincula actividades con documentos
INSERT INTO actividad_documentos (actividad_id, documento_id) VALUES
  ('11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222'),
  ('11111111-1111-4111-a111-111111111113', '22222222-2222-4222-a222-222222222223')
ON CONFLICT DO NOTHING;

-- ── Indicadores: 1 con meta+3 mediciones, 1 sin mediciones solo resultado_texto, 1 adicional ──
INSERT INTO indicadores (id, nombre, descripcion, unidad, meta, fecha_evaluacion, resultado_texto, documento_respaldo_id) VALUES
  ('33333333-3333-4333-a333-333333333331', 'Hectáreas bajo manejo sustentable', 'Superficie incorporada a manejo sustentable', 'ha', 5000, '2026-12-31', '', '22222222-2222-4222-a222-222222222225'),
  ('33333333-3333-4333-a333-333333333332', 'Talleres participativos realizados', 'Número de talleres con acta firmada', 'talleres', NULL, '', '12 talleres realizados; 240 participantes en total', NULL),
  ('33333333-3333-4333-a333-333333333333', 'Avance del programa', 'Porcentaje de avance en la elaboración', '%', 100, '2026-09-30', '', '22222222-2222-4222-a222-222222222226')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mediciones (indicador_id, periodo, valor) VALUES
  ('33333333-3333-4333-a333-333333333331', '2026-T1', 800),
  ('33333333-3333-4333-a333-333333333331', '2026-T2', 1450),
  ('33333333-3333-4333-a333-333333333331', '2026-T3', 2100),
  ('33333333-3333-4333-a333-333333333333', '2026-01', 15),
  ('33333333-3333-4333-a333-333333333333', '2026-02', 35)
ON CONFLICT DO NOTHING;
