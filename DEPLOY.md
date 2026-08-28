# Despliegue en ac.tlaquepaque.gob.mx/ordena

La app (web + backend + Postgres 16) se levanta completa con un solo
comando desde la raíz del repo:

```sh
cp .env.example .env
# edita .env: SESSION_SECRET, ROOT_PASSWORD (y ROOT_EMAIL/ROOT_NAME si quieres)
docker compose up -d --build
```

Esto levanta 3 contenedores en una red interna (`db`, `backend`, `web`).
Solo `web` publica un puerto, y solo en `127.0.0.1:44100` — no queda
expuesto a internet directamente. Al arrancar, el backend migra el schema y
siembra la cuenta ROOT (`ROOT_PASSWORD`) y cualquier cuenta extra que definas
en `backend/seed-admins.json` (ver `backend/README.md`).

## Migración: se retiró pgvector

La búsqueda ya no usa embeddings: el texto de los PDF vive en
`attachments.texto_extraido` y se consulta con full-text nativo de Postgres.
La imagen de la BD pasó de `pgvector/pgvector:pg16` a `postgres:16`.

**Volumen nuevo:** nada que hacer. `docker compose up -d --build` y listo.

**Volumen `pgdata` que ya existía:** hay que soltar la extensión *antes* de
cambiar de imagen, o quedan objetos de tipo `vector` sin su librería. El
`schema.sql` ya trae los `DROP`, solo hay que dejarlo correr una vez con la
imagen vieja:

```sh
# 1. Con `image: pgvector/pgvector:pg16` todavía en docker-compose.yml,
#    arranca el backend: migrate() aplica schema.sql y ejecuta los DROP.
docker compose up -d db backend

# 2. Comprobar que ya no queda nada vectorial (ni extensión ni tablas).
docker compose exec db psql -U postgres -d ordenamiento -c "\dx"

# 3. Ahora sí, poner `image: postgres:16` y recrear todo.
docker compose up -d --build
```

## Publicarlo en /ordena

La app en sí sigue viviendo en `/`, `/admin`, `/login`, etc. — no tiene
ningún prefijo compilado adentro. Para que quede en
`https://ac.tlaquepaque.gob.mx/ordena`, el reverse proxy del servidor
(nginx, probablemente) tiene que **reenviar `/ordena` a `127.0.0.1:44100`
quitando el prefijo** antes de pasarlo al contenedor. Con eso, cero cambios
de código son necesarios.

El fragmento listo para pegar en la config del `server {}` de ese dominio
está en [`deploy/nginx-ordena.conf`](deploy/nginx-ordena.conf). La parte que
importa es la barra final tanto en `location /ordena/` como en
`proxy_pass http://127.0.0.1:44100/` — eso es lo que hace que nginx quite el
prefijo.

**Quien tenga acceso SSH a ac.tlaquepaque.gob.mx** (Leo o el equipo de IT)
es quien tiene que:

1. Clonar/actualizar el repo ahí y correr `docker compose up -d --build`.
2. Agregar el fragmento de `deploy/nginx-ordena.conf` a la config de nginx de
   ese dominio y recargarlo (`nginx -t && systemctl reload nginx`).

Yo no tengo acceso a ese servidor desde aquí — todo lo anterior (Dockerfile,
compose, seed de cuentas) ya quedó listo y probado localmente para que ese
paso sea, en teoría, un `docker compose up` y pegar el bloque de nginx, sin
sorpresas.

## Si el proxy no puede quitar el prefijo

Si quien administra el servidor solo puede hacer un `proxy_pass` que
**mantiene** `/ordena` en la URL que le llega al contenedor (sin stripping),
avisa: en ese caso sí hace falta un cambio de código (una variable
`BASE_PATH` que prefije rutas y assets en `app/`), que no está hecho todavía
porque cambia enlaces en ~20 archivos y es mejor no tocarlo sin confirmar
que hace falta.
