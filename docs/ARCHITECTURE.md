# Arquitectura

Detalle técnico del sistema. Para el runbook de despliegue ver [DEPLOY.md](../DEPLOY.md);
para la referencia de endpoints, [backend/README.md](../backend/README.md).
No incluye pasos de instalación ni valores de entorno: cada tema vive en su documento.

## Panorama

```text
+-----------+    +-------+    +-----+    +---------+    +----------+
| navegador | -> | nginx | -> | web | -> | backend | -> | postgres |
+-----------+    +-------+    +-----+    +---------+    +----------+
  público        quita      Remix      Bun           solo red
  /ordena        /ordena    SSR        router propio interna
```

Tres procesos en dos lenguajes: la web (Node) y la API (Bun) sirven el portal
con TypeScript, y Postgres guarda los datos. Node y Bun corren TypeScript;
Postgres, SQL. La base y la API viven en la red interna sin puertos expuestos;
solo la web responde al exterior.
nginx es el único que habla hacia afuera: recibe `/ordena`, se lo quita y pasa
la petición limpia a la web. Nada expone la dirección interna del backend.
El navegador habla únicamente con la web; nunca con el backend.

## Flujo de una petición

Cada petición pública recorre la misma cadena:

1. nginx quita `/ordena` y reenvía a 127.0.0.1:44100 (`deploy/nginx-ordena.conf`).
2. `server.ts:107` recibe la petición con `node:http`.
3. `app/router.ts:98` enruta; `staticWithPrefix()` sirve `public/`.
4. El controlador (`app/actions/*/controller.tsx`) pide los datos.
5. `backendFetch` (`app/backend.ts:185`) repite la llamada al backend con la cookie.
6. El router manual (`backend/src/app.ts`) resuelve método y ruta.
7. `services/` aplica la regla de negocio y `db/pool.ts` consulta Postgres.
8. `app/middleware/render.tsx` emite el HTML.

La sesión viaja en la cookie: la web la recibe del navegador y `backendFetch`
la reenvía al backend, que la valida contra `user_sessions`.

Los archivos tampoco salen del backend. El navegador los pide a rutas proxy de
la web: `/marca/*` para recursos del mapa, `/poetdum/archivos/:aid` para documentos
del programa y `/admin/participaciones/:id/adjuntos/:aid` para adjuntos. La web
los trae del backend y los entrega; el navegador nunca conoce la URL interna.

La respuesta hace el camino inverso: Postgres devuelve filas, `services/` arma el
resultado, el backend responde JSON y la web lo inserta en el HTML del middleware
de render. Los errores viajan por el mismo camino, con su código HTTP. Cada salto
valida lo suyo: nginx el prefijo, la web la sesión y el backend los permisos con
los datos.

## Estructura de carpetas

```text
ordenamiento/
├── app/                     Frontend Remix: rutas, controladores y vistas
│   ├── actions/             Un controlador por área de ruta
│   │   ├── admin/               Panel de administración
│   │   ├── login/               Inicio y cierre de sesión
│   │   ├── participation/       Formulario de participación y acuse
│   │   ├── poetdum/             Portal de información del programa
│   │   ├── public/              Portada y runtime del navegador
│   │   └── recuperar/           Recuperación y cambio de contraseña
│   ├── data/                 Catálogos, campos del formulario y contratos
│   ├── middleware/           Middleware de render por petición
│   ├── ui/                   Design system propio sobre remix/ui
│   │   ├── admin/                Componentes del panel
│   │   ├── form/                 Campos de formulario y subida de archivos
│   │   ├── images/               Imágenes del tema
│   │   ├── login/                Componentes de acceso
│   │   └── programa/             Componentes del portal del programa
│   └── utils/                Utilidades compartidas (búsqueda, proxy de archivos)
├── backend/                 API y lógica de negocio
│   ├── migrations/          Migraciones SQL, se aplican una sola vez
│   ├── src/
│   │   ├── auth/                Sesiones, contraseñas, roles, tokens
│   │   ├── db/                  Pool de Postgres y migrador
│   │   ├── files/               Límites de subida, nombres y entrega de PDF
│   │   ├── routes/              Endpoints por recurso
│   │   ├── services/            Reglas de negocio y generación de documentos
│   │   ├── text/                Extracción de PDF y vista previa de .docx
│   │   └── types/               Declaraciones de tipos
│   ├── schema.sql           Esquema SQL, se aplica en cada arranque
│   └── Dockerfile
├── deploy/                  Fragmento de configuración de nginx
├── docs/                    Documentación técnica
├── public/                  Estáticos, CSS y JS del navegador
├── scripts/                 Utilidades de mantenimiento (catálogo SEPOMEX)
├── .storybook/              Configuración de Storybook
├── Dockerfile               Imagen del frontend (Node)
├── docker-compose.yml       Los tres servicios
├── server.ts                Servidor HTTP y cadena de middleware
├── hmr.ts                   Recarga en caliente en desarrollo
├── vitest.config.ts
├── package.json
└── tsconfig.json
```

No aparecen `node_modules/`, `.git/` ni los directorios de configuración local
del entorno de desarrollo: no forman parte del proyecto que se despliega.
Los archivos de entorno (`.env`) tampoco aparecen: están ignorados por git y
viajan aparte en cada máquina.

- `node_modules/`: dependencias instaladas, no código del proyecto.
- `.git/`: historial de versiones, no parte del despliegue.
- La configuración local de cada máquina: solo existe en el equipo de desarrollo.

La raíz concentra el arranque y la composición:

| Archivo | Para qué |
| --- | --- |
| `server.ts` | Servidor HTTP y cadena de middleware |
| `hmr.ts` | Recarga en caliente en desarrollo |
| `docker-compose.yml` | Los tres servicios |
| `Dockerfile` | Imagen del frontend (Node) |
| `backend/Dockerfile` | Imagen del backend (Bun) |
| `vitest.config.ts` | Configuración de Vitest |
| `package.json` | Dependencias y scripts de la web |
| `tsconfig.json` | Configuración de TypeScript |
| `scripts/` | Utilidades de mantenimiento (catálogo SEPOMEX) |
| `public/` | Estáticos, CSS y JS del navegador |
| `.storybook/` | Configuración de Storybook |
| `deploy/` | Fragmento de configuración de nginx |

Todo lo que se despliega está en este árbol.

## Frontend

La web sirve el portal y el panel con render del lado del servidor. El navegador
solo recibe HTML y pide datos a rutas de la propia web, que a su vez consultan al
backend con `fetchJsonOr` (`app/backend.ts:216`). La sesión viaja en la cookie,
que la web reenvía al backend en cada llamada.

### Remix 3

Las rutas se declaran con `route()`, `get()` y `form()` en `app/routes.ts`.
Cada área tiene su controlador en `app/actions/`: recibe la petición, pide datos
al backend y devuelve la vista.

El render pasa por un middleware por petición en `app/middleware/render.tsx`, que
emite HTML con streaming: la página llega por partes y el navegador pinta antes
de que todo termine. Sin ese middleware no hay HTML: se instala de nuevo en cada
petición. Los estáticos salen de `app/assets.ts` y `public/`.

`react-leaflet` está declarado en `package.json` pero sin uso. El mapa de la
portada usa Leaflet directo cargado por CDN.

Seis áreas agrupan los controladores de `app/actions/`: `admin` para el panel,
`login` para el acceso, `participation` para el formulario y el acuse, `poetdum`
para el portal del programa, `public` para la portada y `recuperar` para la
contraseña. Cada una trae su controlador y sus vistas.

### Design system

Los componentes viven en `app/ui/`, un design system propio sobre `remix/ui`.
Los estilos se generan con `css()` en el servidor, así el HTML ya trae el CSS
que necesita. Los tokens de color están en `app/ui/civic-horizon.ts`.

El panel tiene sus componentes en `app/ui/admin/`; el portal del programa, en
`app/ui/programa/`. Los campos de formulario y la subida de archivos están en
`app/ui/form/`; el acceso, en `app/ui/login/`.

`app/ui/images/` guarda las imágenes del tema. El catálogo visual de estos
componentes vive en Storybook (ver [Pruebas](#pruebas)).

### Datos en el frontend

`app/data/` guarda catálogos, campos del formulario y contratos con el backend.
Los contratos fijan la forma de cada respuesta para que ambos lados coincidan.
Los contratos se prueban con las pruebas de contrato (ver [Pruebas](#pruebas)).
`app/utils/` reúne utilidades compartidas: búsqueda y proxy de archivos.

El catálogo de colonias sale de `scripts/build-catalogo.ts` (`npm run
build:catalogo`) y alimenta el autocomplete de `/api/colonias`. Los campos del
formulario y los catálogos del programa viven en `app/data/`.

### Recursos de terceros por CDN

El mapa carga Leaflet 1.9.4 desde unpkg y los iconos llegan como web component
de Iconify (`api.iconify.design`), que pinta cada icono como SVG en el navegador.
Nada de esto se empaqueta: el navegador lo descarga de la CDN en tiempo de
ejecución. La política de seguridad de contenido que autoriza esas cargas vive
en `server.ts:83-97`.

### Rutas

Cuatro áreas cubren todo el portal:

| Área | Rutas |
| --- | --- |
| Portal público | `/`, `/api/colonias`, `/login`, `/recuperar`, `/restablecer`, `/confirmar-correo`, `/error` |
| Participación | `/participation`, `/participation/acuse/:folio` |
| Programa | `/poetdum`, `/poetdum/avances`, `/poetdum/calendario`, `/poetdum/seguimiento`, `/poetdum/actividades`, `/poetdum/documentos`, `/poetdum/indicadores`, `/marca/*` |
| Panel | `/admin` y subrutas: exportar, usuarios, participaciones, actividades, indicadores, consulta, estadisticas, sesiones, cuenta, personalizacion |

El acceso vive en `/login`; la recuperación, en `/recuperar` y `/restablecer`;
y la confirmación del correo, en `/confirmar-correo`. Los fallos caen en `/error`.

La portada (`/`) presenta el programa y el mapa con sus colonias. `/marca/*`
sirve los recursos que el mapa necesita en el navegador.

`/api/colonias` alimenta el autocomplete de colonias (catálogo SEPOMEX) del
formulario. Al enviar, la participación recibe un folio y el acuse queda en
`/participation/acuse/:folio` con su PDF.

El panel agrupa la operación diaria: participaciones (nueva, presencial, formatos,
detalle, envío, documentos, resolución, Word, acuse y adjuntos), actividades,
indicadores, consulta y su proyecto, estadísticas, sesiones, cuenta y
personalización. Todo cuelga de `/admin` y comparte el mismo guard.

Las rutas de `/admin` exigen sesión con el guard `requireAdminUser`
(`app/backend.ts:265`). La personalización del sitio también vive en el panel,
con auditoría de cada cambio (`customization_audit_logs`).

## Backend

La API concentra la lógica de negocio y el acceso a datos. Corre en Bun y expone
endpoints que solo consume la web; ningún navegador la llama directo.

### Runtime

Bun 1 con `Bun.serve` (`backend/src/server.ts:21-34`). Sin framework web por
decisión deliberada: el router es manual (ver `backend/src/app.ts:452-478`).
Cada petición entra por `server.ts`, `app.ts` la dirige al archivo de `routes/`
que toca y `services/` ejecuta la regla. Nada se resuelve por convención: todo
mapeo de método y ruta está escrito a mano.

Las contraseñas se verifican con `Bun.password` (argon2id). Las sesiones son
cookies firmadas que el backend valida en cada petición.

En desarrollo corre con `bun --watch src/server.ts`; en producción, con
`bun src/server.ts`. Ambos comandos están en `backend/package.json`.

### Capas

Cada capa tiene una sola responsabilidad y el orden sigue al de una petición:
de `routes/` a `db/`.

- `routes/`: endpoints por recurso. Un archivo por recurso.
- `services/`: reglas de negocio y generación de documentos. Aquí viven
  `folio.ts`, `acuse-token.ts`, `formato-manuscrito.ts` y `mail.ts`.
- `db/`: pool de Postgres y migrador. `pool.ts` conecta; `migrate.ts` migra.
- `files/`: límites de subida, nombres y entrega de PDF. `limits.ts` fija topes.
- `text/`: extracción de texto de PDF y vista previa de .docx.
- `auth/`: sesiones, contraseñas, roles y tokens. Todo el acceso pasa por
  `auth.ts`.
- `types/`: declaraciones de tipos.

`text/` merece línea propia: extrae el contenido de los PDF con pdf-parse para
que la búsqueda los encuentre, y arma la vista previa de .docx con jszip y
saxes. El texto extraído de cada adjunto termina en `attachments.texto_extraido`.

### Patrón

Los endpoints se registran desde `app.ts`; lo nuevo entra en `routes/` y la
regla de negocio en `services/`. El flujo típico cruza las tres capas: `routes/`
valida la entrada, `services/` decide y `db/` persiste. La lista de endpoints
vive en [backend/README.md](../backend/README.md), no aquí. Todo lo nuevo pasa
por ahí: no hay registro manual en otro archivo.

## Base de datos

PostgreSQL 16 con solo la extensión pgcrypto. La búsqueda es full-text nativo;
no hay extensiones vectoriales. El esquema completo vive en `backend/schema.sql`:
dieciséis tablas más una secuencia para los folios.

### Tablas

Dieciséis tablas en `backend/schema.sql`, en cuatro grupos: acceso y sesiones
(`users`, `password_resets`, `email_changes`, `user_sessions`), participaciones
y sus documentos (`participations`, `formatos_presenciales`,
`participacion_documentos`, `participacion_envios`), programa (`actividades`,
`actividad_archivos`, `indicadores`, `mediciones`, `proyecto_documentos`,
`attachments`) y personalización (`site_customizations`,
`customization_audit_logs`). Una línea por tabla:

| Tabla | Propósito |
| --- | --- |
| users | Cuentas y roles |
| password_resets | Tokens de recuperación de contraseña |
| email_changes | Confirmaciones de cambio de correo |
| user_sessions | Sesiones firmadas |
| participations | Observaciones ciudadanas y su índice de búsqueda |
| formatos_presenciales | Formatos captados en persona |
| participacion_documentos | Documentos PDF asociados a cada folio |
| participacion_envios | Constancia de cada envío de correo |
| proyecto_documentos | Documentos del programa |
| attachments | Adjuntos con texto extraído para búsqueda |
| site_customizations | Personalización del sitio (JSONB) |
| customization_audit_logs | Auditoría de cambios de personalización |
| actividades | Módulo unificado de actividades |
| actividad_archivos | Archivos de cada actividad |
| indicadores | Indicadores del programa |
| mediciones | Mediciones de los indicadores |

`folios_participacion` no es una tabla: es una secuencia (`schema.sql:202`)
que numera los folios de participación.

`participacion_envios` guarda la constancia de cada correo: fecha, hora y
resultado, incluso cuando el envío falla.

### Búsqueda de texto completo

`participations.busqueda_tsv` indexa el contenido de cada observación y
`attachments.texto_tsv`, el texto extraído de los adjuntos. Ambas son columnas
generadas con `to_tsvector('spanish', …)` e índices GIN. Cada inserción actualiza
el índice sin pasos extra. Los índices GIN aceleran la búsqueda por palabras en
español.

No hay embeddings ni base vectorial: la búsqueda es full-text nativo de Postgres.

### Migraciones

`schema.sql` crea cada objeto con `IF NOT EXISTS` y se aplica en cada
arranque. `migrations/001..004` se aplican una sola vez, en orden lexicográfico,
y nunca se reejecutan:

- `001`: claves primarias UUID.
- `002`: módulo unificado de actividades.
- `003`: renombra «Bitácora Ambiental» → «Bitácora» en la personalización guardada.
- `004`: catálogos del formulario de participación.

El nombre de cada archivo decide su turno: 001 corre antes que 002.

### Siembra

`seed.ts` crea la cuenta root en cada arranque con `ROOT_EMAIL`, `ROOT_NAME` y
`ROOT_PASSWORD` del entorno. `seed-demo.ts` carga datos de demostración.
La siembra corre sola: nadie ejecuta pasos manuales para el primer acceso.

## Seguridad

La seguridad combina sesión, contraseñas, roles, validación de archivos y límites
de uso. Cada mecanismo vive en su archivo y ninguno depende de valores escritos
en el código.

| Mecanismo | Dónde | Qué hace |
| --- | --- | --- |
| Cookie de sesión firmada (HMAC-SHA256, HttpOnly, SameSite=Lax, 7 días) | `backend/src/auth/auth.ts` | Valida la sesión en cada petición |
| Contraseñas con argon2id (`Bun.password`) | `backend/src/auth/auth.ts` | Guarda hashes, nunca texto |
| Roles root/admin/user y guard `requireAdminUser` | `app/backend.ts:265` | Cierra el panel a visitas |
| Validación de subidas en profundidad | `backend/src/services/upload-guard.ts` | Denylist, whitelist, magic bytes, MIME canónico, nosniff |
| Límite de tasa en acceso | backend | 10 intentos cada 15 minutos |
| Límite de tasa en participaciones | backend | 10 POST por minuto |
| Tope de cuerpo en autenticación | backend | 8 KB por petición |
| Tope de avatar | backend | 5 MB por archivo |
| CSP y cabeceras | `server.ts:83-97` | Controla qué carga el navegador |
| URL pública del entorno | backend | Los enlaces salen de `APP_PUBLIC_URL`, nunca de `Host` |

Ningún secreto vive en el código: solo nombres de variables cuyo valor llega por
entorno. La cookie dura 7 días y exige HTTPS en producción (`COOKIE_SECURE`).
Es HttpOnly y SameSite=Lax: el JavaScript del navegador no la lee y otros sitios
no la adjuntan. La cabecera `Host` nunca decide enlaces ni orígenes.

La validación de archivos mira la extensión (~100 en denylist), el tipo de negocio
(whitelist), los magic bytes y el MIME canónico, y sirve con `nosniff`.

## Documentos generados

El backend genera cada documento con la librería indicada. Los PDF salen de
pdfkit; Word y Excel, de docx y xlsx; la vista previa de .docx combina jszip
con saxes.

| Documento | Librería | Dónde |
| --- | --- | --- |
| Acuse de recepción (PDF de 1 hoja, firmado 48 h) | pdfkit | `backend/src/services/` |
| Formato manuscrito (PDF) | pdfkit | `backend/src/services/` |
| Participación en Word (.docx) | docx | `backend/src/services/` |
| Exportaciones Excel (.xlsx) | xlsx | `backend/src/services/` |
| Oficios de respuesta (PDF) | pdfkit | `backend/src/services/` |
| Vista previa de .docx | jszip + saxes | `backend/src/text/` |

Las exportaciones Excel cubren actividades, participaciones y usuarios. Los
oficios acompañan cada respuesta enviada por correo.

El acuse es el documento central: una hoja en PDF, firmada y con vigencia de
48 horas. Acompaña al correo que confirma cada registro.

El formato manuscrito replica en PDF el formato que se llena en persona.
El Word lleva la participación completa; el Excel lista actividades,
participaciones y usuarios.

## Correo

Nodemailer 9 envía cada correo transaccional:

| Correo | Cuándo se manda |
| --- | --- |
| Acuse con PDF | Al registrar una participación |
| Respuesta con oficio | Al responder una participación |
| Reenvío | Al reenviar desde el panel (ruta enviar) |
| Aviso de actividad | Al publicar una actividad |
| Recuperación de contraseña | Al pedir restablecerla (token de 60 minutos) |
| Confirmación de cambio de correo | Al pedir cambiar el correo |
| Prueba SMTP | Al probar la configuración desde el panel |

Cada envío queda registrado con fecha, hora y resultado, también cuando falla.
La constancia vive en `participacion_envios` y el panel la muestra en el
detalle de cada participación.

La recuperación usa tokens de 60 minutos y el cambio de correo pide confirmación
antes de aplicarse.

`MAIL_FROM` firma los correos del sistema y `MAIL_FROM_CONSULTA`, los de la
consulta. Ambos se configuran en el entorno junto al resto de SMTP.

Los avisos de actividad salen al publicar; la prueba SMTP, al verificar la
configuración. El reenvío se opera desde el panel, en la ruta enviar de cada
participación. La configuración SMTP se explica en [DEPLOY.md](../DEPLOY.md).

## Despliegue

Tres servicios en una red interna de Compose:

### Servicios

| Servicio | Imagen | Puertos | Verificación |
| --- | --- | --- | --- |
| db | postgres:16 | Ninguno (red interna) | pg_isready |
| backend | oven/bun:1-slim | Ninguno (red interna) | GET /api/health |
| web | node:24-slim | 127.0.0.1:44100 y 127.0.0.1:43100 | GET /ordena/participation |

`db` y `backend` no exponen puertos: viven en la red interna y solo la web habla
con ellos. La web escucha en 127.0.0.1:44100 y nginx le reenvía lo que llega con
`/ordena`. Cada servicio trae su verificación: `pg_isready`, `GET /api/health` y
`GET /ordena/participation`.

Los tres servicios comparten una red interna de Compose: dentro de ella, la web
usa el 44100, el backend el 5920 y Postgres el 5432. Solo el de la web llega al
host, y solo a loopback para que nginx lo tome.

### Volúmenes

Dos volúmenes persisten lo importante:

- `pgdata`: los datos de Postgres.
- `uploads`: los archivos del backend.

Ambos sobreviven a reconstruir las imágenes: los datos y los archivos no se
pierden al actualizar un contenedor. `uploads` guarda lo que suben los usuarios
y los documentos que genera el backend.

### Prefijo /ordena

El portal vive bajo el prefijo `/ordena` (`BASE_PATH` en `app/routes.ts:3` y
`server.ts:106`). nginx recibe `/ordena/…`, quita el prefijo y reenvía a la
web; lo que no cuelga de `/ordena` no llega al portal. La configuración está
en `deploy/nginx-ordena.conf`.

### Limitación

El reenvío multipart materializa los archivos en memoria antes de entregarlos al
backend. De ahí los topes de memoria del compose. `MAX_UPLOAD_MB` y
`MAX_UPLOAD_FILES` se validan en la web (`app/utils/uploads.ts`) y en el backend
(`backend/src/files/`): ningún archivo grande llega a memoria sin permiso.

Los pasos y valores de producción están en [DEPLOY.md](../DEPLOY.md).

## Pruebas

Tres niveles cubren el sistema:

- Frontend: Vitest para `app/**/*.test.ts`.
- Backend: `bun test`.
- Design system: Storybook como catálogo visual.

Tres pruebas de contrato amarran a ambos lados: `participacion-contrato.test.ts`,
`personalizacion-textos-contrato.test.ts` y `texto-rico-contrato.test.ts` verifican
que la web y la API hablen el mismo formato. Si la API cambia la forma de una respuesta, el contrato
correspondiente falla antes de llegar a producción.

Se corren con `npm test` en la raíz, `bun test` en `backend/` y `npm run storybook`
para ver el catálogo. El catálogo abre en el puerto 6006. Vitest corre con
jsdom para lo que toca DOM.
`npm run typecheck` y `npm run lint` revisan tipos y estilo en la web;
`bun run typecheck` hace lo propio en el backend. `npm run format` unifica el
estilo con Prettier. `npm run build-storybook` genera el catálogo estático para
publicarlo.

## Referencias

Se leen en orden: primero el README para arrancar, luego DEPLOY.md para
desplegar y la referencia del backend para integrar o extender la API. Todo
enlace apunta a un archivo del repo.

| Documento | Qué contiene |
| --- | --- |
| [README.md](../README.md) | Puesta en marcha, comandos y variables |
| [DEPLOY.md](../DEPLOY.md) | Despliegue, cuenta root, SMTP y migración |
| [backend/README.md](../backend/README.md) | Endpoints, modelo de datos y bitácora |
