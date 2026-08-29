# Ordenamiento Backend

> Para levantar el stack completo (web + backend + BD) en un solo
> `docker compose up`, usa el `docker-compose.yml` de la raíz del repo, no
> este. El de aquí sirve para desarrollar/probar solo el backend.

API de participaciones de ordenamiento ecológico. **Relacional puro** sobre
**Postgres 16**, sin extensiones. El contenido de los PDF y los campos del
formulario se buscan con el **full-text nativo** de Postgres
(`tsvector`/`tsquery` en español).

## Regla de oro

Todo es relacional. La búsqueda combina tres fuentes: full-text sobre los
campos del formulario (`participations.busqueda_tsv`), full-text sobre el
texto extraído de los PDF (`attachments.texto_tsv`) y coincidencia literal
por folio/nombre. No hay embeddings ni base vectorial: se retiraron porque
lo que se necesita del PDF es verlo, descargarlo y encontrarlo por su texto.

## Física vs digital

Son la **misma entidad** `participations`, distinguida por `origen`
(`digital` = crea el usuario; `fisica` = crea el admin con rol `admin`).
Ambos pueden llevar adjunto. El PDF del físico escaneado (sin capa de texto)
marca `needsOcr`.

## Modelo de datos

- `users` – admin / user
- `participations` – folio autogenerado `SPAGU-DGTPU-E-000X`, origen, datos
  del formulario, estado
- `attachments` – archivos subidos (PDF, DWG, JPG, SHX...) y, para los PDF
  con capa de texto, ese texto en `texto_extraido` + índice `texto_tsv`

## Arranque

### Con Docker (BD + API reproducibles)

```sh
cd backend
docker compose up -d --build
```

Crea la BD y la API. Al arrancar, la API siembra sola la cuenta ROOT (ver
`ROOT_PASSWORD` abajo) y datos de demo — no hace falta ningún paso manual.

### En local (Bun + Postgres nativo)

```sh
# 1. Postgres 16 (Docker) o nativo Windows
docker compose up -d db

# 2. Instalar dependencias
bun install

# 3. Servidor (migra el schema y siembra ROOT + demo al arrancar)
bun run dev
```

Servidor en `http://localhost:5920`.

### Cuentas admin (más allá de ROOT)

Para que se creen otras cuentas admin al arrancar (por ejemplo la de Leo),
copia `seed-admins.example.json` a `seed-admins.json` (gitignorado, igual que
`.env`) y agrega ahí tantas entradas como necesites:

```json
[{ "email": "leo@ordenamiento.gob.mx", "name": "Leo", "password": "...", "role": "admin" }]
```

Es idempotente: al reiniciar, las cuentas cuyo correo ya existe se omiten sin
error. En Docker, descomenta el volumen correspondiente en
`docker-compose.yml`; en local, basta con que el archivo esté en `backend/`.

## Seguridad

- `SESSION_SECRET **debe** estar set en producción. En `docker-compose.yml`se
lee de`.env` (`SESSION_SECRET`); si no, usa un placeholder inseguro.
Configura un valor real en un archivo `.env` local (no versionado).
- `DATABASE_URL` por defecto usa credenciales de desarrollo
  (`postgres:postgres`). Cámbialas en tu entorno real.
- La cuenta ROOT nunca tiene password hardcodeado: se define con
  `ROOT_PASSWORD` (ver `.env.docker.example`). En desarrollo, si falta, se
  genera uno aleatorio temporal visible solo en el log de arranque. En
  producción, si falta, el servidor no arranca (fail-fast).

## Endpoints

| Método | Ruta                                       | Descripción                                                           |
| ------ | ------------------------------------------ | --------------------------------------------------------------------- |
| GET    | `/api/health`                              | Health check                                                          |
| POST   | `/api/auth/register`                       | Crear usuario (body: email, name, password, role?)                    |
| POST   | `/api/auth/login`                          | Login → cookie HttpOnly                                               |
| POST   | `/api/auth/logout`                         | Cerrar sesión                                                         |
| GET    | `/api/auth/me`                             | Usuario actual                                                        |
| GET    | `/api/participations`                      | Listado con filtros + paginación                                      |
| GET    | `/api/participations/:id`                  | Detalle + adjuntos                                                    |
| POST   | `/api/participations`                      | Crear (multipart: folio autogenerado, origen, nombre, correo, pdf...) |
| POST   | `/api/participations/:id/resolucion`       | Dictaminar + notificar (admin) — flujo canónico de cambio de estado   |
| DELETE | `/api/participations/:id`                  | Eliminar (admin)                                                      |
| GET    | `/api/participations/:id/attachments/:aid` | Ver / descargar adjunto                                               |
| GET    | `/api/participations/:id/word`             | Exportar .docx (admin)                                                |
| POST   | `/api/participations/enviar`              | Reenviar participación por correo (admin)                             |
| POST   | `/api/mail/test`                           | Correo de prueba SMTP (admin) — cableado a Personalización            |
| POST   | `/api/avisos/enviar`                      | Enviar aviso por correo (admin)                                       |
| GET/POST/DELETE | `/api/reuniones`, `/api/avisos`, `/api/poel`, `/api/export/:tabla`, `/api/users`, `/api/stats`, `/api/settings/*` | Bitácora, exportación, usuarios, stats, personalización (ver `app.ts`) |

> **Nota 2026-08-28 (Arquitecto):** Se eliminaron `GET /api/search` (`searchParticipations`) y
> `PATCH /api/participations/:id/estado` (`updateEstado`) por ser huérfanos sin consumidor en
> `app/` y, en el caso de PATCH, por bypasear el flujo canónico de dictamen (`/resolucion` con
> motivo/dirección/cita y auditoría). Ver `backend/src/services/search.ts` eliminado y
> `participations.ts:updateEstado` eliminado. `POST /api/mail/test` se mantiene y ahora está
> cableado a `app/actions/admin/personalizacion-controller.tsx` + `personalizacion-page.tsx`
> (form `testMail`) de forma CSP-compliant.

## Env

| Variable         | Default                                                    | Uso             |
| ---------------- | ---------------------------------------------------------- | --------------- |
| `DATABASE_URL`   | `postgres://postgres:postgres@localhost:5432/ordenamiento` | Conexión        |
| `SESSION_SECRET` | (cambiar en prod)                                          | Firma de cookie |
| `PORT`           | `5920`                                                     | Puerto          |
