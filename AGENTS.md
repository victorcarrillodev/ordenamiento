# Ordenamiento Agent Guide

This app was scaffolded with `remix new`. Use these conventions when continuing to build it out.

## Commands

```sh
npm i
npm run dev
npm run hmr
npm run start
npm test
npm run typecheck
```

## Building Features

Refer to ./.agents/skills/remix/SKILL.md

## Starter Layout

- `app/actions/controller.tsx` owns the top-level route actions
- `app/actions/home-page.tsx` and `app/actions/document.tsx` render the route-owned starter UI
- `app/actions/public/` contains the browser runtime entry and interactive prompt button
- `app/routes.ts` defines the shared route contract used by server and browser modules for type-safe hrefs
- `app/router.ts` wires routes to route handlers
- `app/middleware/render.tsx` installs the request-scoped renderer used by actions
- `app/assets.ts` owns the server-side asset pipeline used by the asset route and renderer
- Root `public/` contains static files served unchanged from the app root

## Route Ownership

- Start from `app/routes.ts` and map each route to the narrowest owner on disk.
- Put top-level route actions in `app/actions/controller.tsx`.
- Add `app/actions/<route-key>/controller.tsx` for nested route maps that need their own actions or middleware.
- Keep route-owned page modules next to the route that owns them.
- Move shared UI to `app/ui/`, not `app/actions/`.

## Build-Out Notes

- This starter intentionally begins small; add directories like `app/data/` and `test/` only when you need them.
- Prefer putting code in the narrowest owner before introducing shared modules.
- Avoid generic dumping-ground directories like `app/lib/` or `app/components/`.

## Phase Agent Workflow

Todo cambio de código no trivial en este repo (feature, fix o refactor) pasa por un pipeline de cuatro agentes antes de darse por terminado. El agente principal actúa como **Developer-agent**; los otros tres son subagentes definidos en `.claude/agents/` e invocables por nombre.

1. **Developer** (agente principal) — implementa la tarea: código limpio, bien estructurado, DRY, siguiendo las convenciones de este archivo.
2. **Architect** (`.claude/agents/architect.md`) — reubica y modulariza el código, aplica un análisis de riesgo tipo CRAP, decide qué se centraliza en `app/ui/` vs. qué se queda en su owner más estrecho.
3. **QA** (`.claude/agents/qa.md`) — corre typecheck/lint/format/tests y revisa el diff contra los estándares de calidad de este archivo. Si **RECHAZA**, el ciclo vuelve al paso 1 (Developer corrige, Architect reconfirma si aplica) antes de continuar.
4. **Testing** (`.claude/agents/testing.md`) — intenta romper el resultado con casos límite y pruebas de seguridad, y entrega un reporte. Si hay hallazgos, el ciclo vuelve al paso 1.

El ciclo se repite hasta que QA aprueba y Testing no reporta hallazgos (o el usuario acepta explícitamente dejar algo pendiente). Si después de 3 vueltas completas el ciclo no cierra, el agente principal se detiene y explica al usuario qué sigue fallando en vez de seguir iterando solo.

**Cuándo aplica el pipeline completo:** cambios de código reales. Preguntas, exploración o respuestas puramente informativas no lo requieren.
