# Ajuste de botones de adjuntos en admin — Plan

> **Para Hermes:** usar pipeline fijo Dev→Arquitecto→QA→Tester con los agents child de Traycer (A2A). Manager ejecuta el plan, delega cada tarea a un agent child, verifica salida con gates reales y no confía en reportes autocertificados.

**Goal:** Dejar en `/ordena/admin/participaciones/` solo 2 botones por adjunto (Ver + Descargar), donde Ver permite ver archivos PDF y DOCX inline, y Descargar funciona correctamente.

**Current context / assumptions:**
- Repo: `/home/vic/Escritorio/Proyectos/ordenamiento`, rama `main`.
- Working tree ya tiene modificaciones sin commitear en 4 archivos:
  - `app/actions/admin/controller.tsx` — mojibake UTF-8 corregido (línea 2).
  - `app/actions/admin/detalle-page.tsx` — vista de adjuntos reescrita (`VistaAdjunto` con `<object>` PDF, `<iframe>` DOCX, `<img>` imágenes).
  - `app/actions/home-page.tsx` — dead code eliminado (lint).
  - `backend/src/services/customizations.ts` — tipado corregido (BE typecheck).
- `public/admin.css` ya tiene `.btn--green` y `.btn--excel` definidos. Falta `.office-viewer` para el iframe de DOCX.
- Branch `main` está 1 commit atrás de `origin/main` (commit externo del usuario). Antes de push hay que decidir polígona de sincronización.
- Docker daemon no disponible en este entorno; verificación de build se hace por resolución ESM.

**Proposed approach:**
1. Validar que el cambio de `detalle-page.tsx` compila y pasa tests de FE.
2. Añadir CSS `.office-viewer` a `public/admin.css` (inline con el estilo del panel).
3. Verificar que el botón "Ver" abre el visor inline correctamente (PDF → object, DOCX → iframe, imágenes → img).
4. Verificar que el botón "Descargar" funciona (query param `?download=1` + backend).
5. Ejecutar todos los gates (FE lint/typecheck/test, BE typecheck/test).
6. Commit y push a `main` (después de alinear rama o con decisión documentada del usuario).

**Files cambiarán:**
- `app/actions/admin/detalle-page.tsx` — VistaAdjunto y botones (si no está ya completo).
- `public/admin.css` — añadir `.office-viewer`.
- Posiblemente `app/backend.ts` si el endpoint de adjuntos necesita ajuste de cabeceras MIME o Content-Disposition.

**Tests / validation:**
- FE: `bun run lint`, `bun run typecheck`, `bun run test app/actions/admin`.
- BE: `bun run --cwd backend typecheck`, `bun run --cwd backend test`.
- Manual: navegar a `/ordena/admin/participaciones/`, abrir una participación con PDF y DOCX, verificar que el visor inline muestra contenido y que Descargar genera archivo descargable con nombre correcto.

**Risks, tradeoffs, open questions:**
- Si el backend no sirve el MIME correcto para DOCX, el iframe no renderiza. Verificar cabeceras.
- Si google docs viewer o alguna dependencia externa es necesaria para DOCX, hay que組み込む.
- Divergencia de rama: `main` local detrás de `origin/main`. Antes de push, resolver (pull/merge o decisión del usuario).

---
### Tareas para los agents child (pipeline A2A)

#### Task 1 — Validar gates FE y BE (QA child)
**Agent:** QA (`5bcc7f7b`)
**Goal:** Ejecutar lint/typecheck/test en FE y BE, reportar resultados reales.
**Files:**
- Ejecutar: `bun run lint`, `bun run typecheck` (root), `bun run test app/actions/admin`.
- BE: `bun run --cwd backend typecheck`, `bun run --cwd backend test`.
**Entrega:** output crudo de cada comando + conteo de errores/pasos.

#### Task 2 — Revisar y completar `detalle-page.tsx` + CSS (Arquitecto child)
**Agent:** Arquitecto (`1c1d36eb`)
**Goal:** Verificar que `VistaAdjunto` renderiza bien PDF/DOCX/imágenes, que solo hay 2 botones por adjunto, y que el CSS `.office-viewer` existe o crearlo.
**Files:**
- Leer: `app/actions/admin/detalle-page.tsx` (líneas 86-146, 404-438).
- Leer/crear: `public/admin.css` (.office-viewer).
**Entrega:** diff de cambios propuestos + justificación.

#### Task 3 — Verificar backend de adjuntos (Dev child)
**Agent:** Dev (`28a1f9be`)
**Goal:** Asegurar que el endpoint de adjuntos sirve MIME correcto y `?download=1` funciona.
**Files:**
- Leer: `app/backend.ts` (endpoint `adjunto`), `backend/src/services/attachments.ts`.
**Entrega:** bosquejo de cambios si hay que ajustar cabeceras.

#### Task 4 — Ejecutar verificación final + commit/push (Manager inline)
**Agent:** Este mismo (Manager `04578a9d`).
**Goal:** Ejecutar gates finales, aplicar correcciones si fallan, y hacer commit + push de los 4 archivos modificados.
**Entrega:** confirmación de push + estado de rama post-push.
