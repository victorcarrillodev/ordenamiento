# Ordenamiento

Portal web de consulta pública del programa de ordenamiento ecológico territorial
del municipio de San Pedro Tlaquepaque, Jalisco. Publica el avance del programa,
recibe observaciones de la ciudadanía y sigue cada participación con folio y acuse.

## Funcionalidades

- Mapa público con catálogo de colonias para ubicar cada predio.
- Portal del programa con actividades, calendario y avances.
- Seguimiento, indicadores y documentos del programa.
- Formulario de participación ciudadana con folio y acuse en PDF.
- Panel de administración de participaciones, actividades e indicadores.
- Administración de usuarios y personalización del sitio.
- Envío de correo: acuse, respuesta, avisos y recuperación de contraseña.

## Tecnologías

| Capa | Tecnología | Para qué |
| --- | --- | --- |
| Frontend | Remix 3.0.0-beta.10, TypeScript | Rutas, vistas y SSR |
| UI | remix/ui propio, CSS con SSR | Design system del portal |
| Mapas | Leaflet 1.9.4 por CDN | Mapa de la portada |
| Iconos | Iconify, web component | Iconografía |
| Backend | Bun 1, Bun.serve, router propio | API y lógica de negocio |
| Base de datos | PostgreSQL 16, solo extensión pgcrypto | Persistencia y búsqueda |
| PDF | pdfkit 0.20 | Acuses, formatos y oficios |
| Office | docx 9.7, xlsx 0.18 | Documentos Word y Excel |
| Extracción | pdf-parse, jszip, saxes | Texto de adjuntos y vista previa |
| Correo | nodemailer 9 | Envíos transaccionales |
| Pruebas | Vitest, bun test, Storybook 10, Vite 8 | Pruebas y catálogo visual |
| Infra | Docker multi-stage, Docker Compose, nginx | Despliegue |

El detalle está en [la documentación de arquitectura](docs/ARCHITECTURE.md).

## Requisitos

Node >= 24.3 (según `engines` en `package.json`), Bun 1 y Docker con Compose.

## Puesta en marcha

### Con Docker

Copia el ejemplo, edítalo y levanta los servicios:

```sh
cp .env.example .env
docker compose up -d --build
```

Quedan tres contenedores: db, backend y web. El portal responde en 127.0.0.1:44100.
Cada servicio tiene verificación de salud.

### En desarrollo

Instala dependencias, levanta solo la base de datos y corre cada parte por separado:

```sh
npm install
docker compose up -d db
```

En una terminal: `cd backend && bun install && bun run dev` (backend).
En otra terminal: `npm run dev` (web).

| Servicio | Puerto |
| --- | --- |
| Web | 44100 |
| Backend | 5920 |
| PostgreSQL | 5432 |

El despliegue en producción se describe en [la guía de despliegue](DEPLOY.md).

## Comandos

| Script | Qué hace |
| --- | --- |
| npm run dev | Servidor web en desarrollo |
| npm run hmr | Recarga en caliente |
| npm run build:catalogo | Genera el catálogo de colonias |
| npm test | Pruebas del frontend con Vitest |
| npm run typecheck | Revisa tipos sin emitir |
| npm run lint | Revisa el código con ESLint |
| npm run format | Formatea con Prettier |
| npm run storybook | Catálogo visual del design system |
| bun run dev | Backend en desarrollo (desde backend/) |
| bun test | Pruebas del backend (desde backend/) |
| bun run typecheck | Revisa tipos del backend |
| bun run root | Utilidad de la cuenta root |

Los scripts no llevan prefijos `NODE_ENV=…` (salvo `start`): esa es sintaxis
de shell POSIX y en Windows `npm run` lanza los scripts con `cmd.exe`, que
falla con «NODE_ENV no se reconoce como un comando interno o externo».
No hacen falta: `app/assets.ts` ya asume `development` cuando la variable no
está, y el resto del código solo pregunta `=== 'production'`. `start` sí la
conserva, porque ahí un valor ausente sí cambiaría el comportamiento (HSTS,
cookie `Secure`, exigir `SESSION_SECRET`). En Docker la fija el `ENV` de la
imagen, así que el contenedor no depende de estos scripts.

## Estructura del proyecto

```text
ordenamiento/
├── app/                     Frontend Remix: rutas, controladores y vistas
│   ├── actions/             Controladores por área de ruta
│   ├── data/                Catálogos y contratos
│   ├── middleware/          Middleware de render por petición
│   ├── ui/                  Design system propio
│   └── utils/               Utilidades compartidas
├── backend/                 API y lógica de negocio
│   ├── migrations/          Migraciones SQL
│   ├── src/                 Código del backend
│   └── schema.sql           Esquema SQL, se aplica en cada arranque
├── deploy/                  Fragmento de configuración de nginx
├── docs/                    Documentación técnica
├── public/                  Estáticos del navegador
├── scripts/                 Utilidades de mantenimiento
├── Dockerfile               Imagen del frontend (Node)
├── docker-compose.yml       Los tres servicios
├── server.ts                Servidor HTTP y middleware
├── hmr.ts                   Recarga en caliente en desarrollo
├── package.json
└── tsconfig.json
```

El árbol comentado completo está en [la documentación de arquitectura](docs/ARCHITECTURE.md).

## Variables de entorno

| Variable | Dónde vive | Para qué |
| --- | --- | --- |
| SESSION_SECRET | Backend | Firma de cookies de sesión |
| ROOT_EMAIL | Backend | Cuenta inicial de administración |
| ROOT_PASSWORD | Backend | Contraseña inicial de administración |
| ROOT_NAME | Backend | Nombre de la cuenta inicial |
| DATABASE_URL | Backend | Conexión a PostgreSQL |
| PORT | Web y backend | Puerto de escucha de cada servicio |
| NODE_ENV | Web y backend | Entorno de ejecución |
| SMTP_HOST | Backend | Servidor de correo |
| SMTP_PORT | Backend | Puerto del servidor de correo |
| SMTP_USER | Backend | Usuario SMTP |
| SMTP_PASS | Backend | Contraseña SMTP |
| MAIL_FROM | Backend | Remitente de correos del sistema |
| MAIL_FROM_CONSULTA | Backend | Remitente de correos de la consulta |
| APP_PUBLIC_URL | Backend | URL pública para enlaces en correos |
| BASE_PATH | Web | Prefijo /ordena del portal |
| MAX_UPLOAD_MB | Web y backend | Tamaño máximo por archivo |
| MAX_UPLOAD_FILES | Web y backend | Máximo de archivos por envío |
| COOKIE_SECURE | Backend | Cookie segura en producción |
| BACKEND_URL | Web | URL interna del backend |

Los valores por defecto están en `.env.example` y `docker-compose.yml`; en producción cámbialos. No se documentan valores aquí.

## Documentación

| Documento | Contenido |
| --- | --- |
| [Arquitectura](docs/ARCHITECTURE.md) | Arquitectura y estructura |
| [Despliegue](DEPLOY.md) | Despliegue, cuenta root, SMTP, migración de instalaciones |
| [API del backend](backend/README.md) | Referencia de la API: endpoints, modelo de datos, bitácora de sesiones |
