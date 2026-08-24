# Ordenamiento Backend

API de participaciones de ordenamiento ecológico. **Relacional** (usuarios,
participaciones, estados) + **vectorial** (contenido de PDFs y campos de
formularios) sobre **Postgres + pgvector**, con la "fórmula única" **TF-IDF**
(matemática pura, sin IA).

## Regla de oro (hibrido)

Solo los `chunks` de contenido van a vectores. Usuarios, folios, estados,
metadatos → relacional. Búsqueda **híbrida**: SQL exacta + coseno vectorial.

## Física vs digital

Son la **misma entidad** `participations`, distinguida por `origen`
(`digital` = crea el usuario; `fisica` = crea el admin con rol `admin`).
Ambos pueden llevar adjunto. El PDF del físico escaneado (sin capa de texto)
marca `needsOcr`.

## Modelo de datos

- `users` – admin / user
- `participations` – folio autogenerado `SPAGU-DGTPU-E-000X`, origen, datos
  del formulario, estado
- `attachments` – archivos subidos (PDF, DWG, JPG, SHX...)
- `participation_chunks` – contenido vectorizado `vector(512)` TF-IDF
- `search_history` – auditoría

## Arranque

### Con Docker (BD + API reproducibles)

```sh
cd backend
docker compose up -d --build
```

Crea la BD y la API. La BD arranca vacía (sin usuarios). Para crear el admin:

```sh
# dentro del contenedor de la api
docker compose exec api bun src/seed.ts
```

### En local (Bun + Postgres nativo)

```sh
# 1. Postgres + pgvector (Docker) o nativo Windows
docker compose up -d db

# 2. Instalar dependencias
bun install

# 3. Migrar + seed de ejemplo
bun run src/seed.ts

# 4. Servidor
bun run dev
```

Servidor en `http://localhost:5920`.

## Seguridad

- `SESSION_SECRET **debe** estar set en producción. En `docker-compose.yml` se
  lee de `.env` (`SESSION_SECRET`); si no, usa un placeholder inseguro.
  Configura un valor real en un archivo `.env` local (no versionado).
- `DATABASE_URL` por defecto usa credenciales de desarrollo
  (`postgres:postgres`). Cámbialas en tu entorno real.
- La contraseña del admin de seed (`admin123`) es **solo para desarrollo**.
  En producción crea usuarios reales con `/api/auth/register` o el seed con
  contraseñas fuertes.

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
| PATCH  | `/api/participations/:id/estado`           | Cambiar estado (admin)                                                |
| DELETE | `/api/participations/:id`                  | Eliminar (admin)                                                      |
| GET    | `/api/participations/:id/attachments/:aid` | Ver / descargar adjunto                                               |
| GET    | `/api/search?q=...`                        | Búsqueda híbrida + filtros                                            |

## Env

| Variable         | Default                                                    | Uso             |
| ---------------- | ---------------------------------------------------------- | --------------- |
| `DATABASE_URL`   | `postgres://postgres:postgres@localhost:5432/ordenamiento` | Conexión        |
| `SESSION_SECRET` | (cambiar en prod)                                          | Firma de cookie |
| `PORT`           | `5920`                                                     | Puerto          |
