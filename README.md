# Ordenamiento

A minimal Remix application starter with a home page.

## Starter Shape

- `app/actions/controller.tsx` owns the top-level route actions.
- `app/actions/home-page.tsx` and `app/actions/document.tsx` render the route-owned starter UI.
- `app/actions/public/` contains the browser runtime entry and interactive prompt button.
- `app/routes.ts` defines the shared route contract used by server and browser modules for type-safe hrefs.
- `app/router.ts` wires routes to handlers.
- `app/middleware/render.tsx` installs the request-scoped renderer used by actions.
- `app/assets.ts` owns the server-side asset pipeline used by the asset route and renderer.
- Root `public/` contains static files served unchanged from the app root.

## Growing The App

- Put top-level route actions in `app/actions/controller.tsx`.
- Add `app/actions/<route-key>/controller.tsx` when a nested route map needs its own actions or middleware.
- Add directories like `app/data/` or `test/` when the app actually needs them.
- Move shared UI into `app/ui/` once more than one route needs it.

## Commands

```sh
npm i
npm run dev
npm run hmr
npm run start
npm test
npm run typecheck
```

Los scripts no llevan prefijos `NODE_ENV=…` (salvo `start`): esa es sintaxis
de shell POSIX y en Windows `npm run` lanza los scripts con `cmd.exe`, que
falla con «NODE_ENV no se reconoce como un comando interno o externo».
No hacen falta: `app/assets.ts` ya asume `development` cuando la variable no
está, y el resto del código solo pregunta `=== 'production'`. `start` sí la
conserva, porque ahí un valor ausente sí cambiaría el comportamiento (HSTS,
cookie `Secure`, exigir `SESSION_SECRET`). En Docker la fija el `ENV` de la
imagen, así que el contenedor no depende de estos scripts.
