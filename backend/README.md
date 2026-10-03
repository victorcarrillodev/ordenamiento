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
marca `needsOcr`. En el acuse y en los correos la modalidad se llama
«Presencial» (`fisica`) o «En línea, mediante la Bitácora» (`digital`).

La participación presencial tiene dos formas de capturarse (`captura`):
**asistida** (el personal llena el registro con lo que dicta la persona) y
**llenado a mano** (se genera e imprime un formato con su folio y se regresa
escrito; queda «Pendiente de recepción» hasta que se registra). En las dos el
folio es el mismo desde el principio hasta la respuesta.

## Modelo de datos

- `users` – admin / user
- `participations` – folio autogenerado `SPAGU-DGTPU-E-000X`, origen, datos
  del formulario, estado
- `attachments` – archivos subidos (PDF, DWG, JPG, SHX...) y, para los PDF
  con capa de texto, ese texto en `texto_extraido` + índice `texto_tsv`
- `actividades` – «Actividades y avances del Programa»: cada actividad se
  registra una vez (fase, tipo, estado, fecha, lugar, resultados, acuerdos,
  publicación y, opcionalmente, su aviso con vigencia). Las vistas públicas
  (próximas, calendario, avances, franja de avisos) salen de reglas sobre esta
  misma tabla, en `services/actividades.ts`
- `actividad_archivos` – archivos de cada actividad con su tipo (convocatoria,
  acta, fotografía…); forman también el repositorio público de documentos
- `indicadores` / `mediciones` – seguimiento y evaluación; el documento de
  respaldo es un archivo de actividad
- `participations` también guarda lo que pide el formulario vigente:
  `alcance_ubicacion` (`municipio` | `especifico`), `tematica`/`tematica_otra`,
  `fuente`/`fuente_otra` (tipo de participante), `genero` y los datos
  complementarios (`domicilio`, `municipio_participante`, `ocupacion`). Las
  listas y los límites de cada campo están en `services/participacion-campos.ts`
  (el frontend los repite en `app/data/participacion.ts`; una prueba de contrato
  los vigila). El folio sale de la secuencia `folios_participacion`
- `formatos_presenciales` – formatos para llenar a mano: reservan el folio y
  llevan su estado («Pendiente de recepción» o recibido)
- `participacion_documentos` – los PDF de cada participación: `formato_escaneado`,
  `version_publica`, `oficio` (firmado, interno) y `oficio_publico`; los dos
  públicos llevan su bandera de publicación y el oficio, número y fecha
- `user_sessions` – una fila por sesión iniciada: quién, cuándo, desde dónde, el
  último aviso de presencia (`last_seen_at`), el tiempo de uso medido
  (`active_seconds`, NULL en las sesiones anteriores a la medición) y el cierre
  (`ended_at`, solo si la persona pulsó «Cerrar sesión»). Ver «Bitácora de sesiones»
- `participacion_envios` – bitácora de los correos de acuse y de respuesta
  (fecha, hora, destinatario y resultado, también cuando falla)
- `proyecto_documentos` – documento técnico y documentos gráficos del Proyecto
  del Programa (PDF, con título y orden)

## Consulta pública, acuse y respuestas

**Etapa de la consulta** (`programa.consulta` en la personalización del tema;
`GET/PUT /api/consulta`): `pendiente` (valor inicial), `abierta` y `concluida`.
El backend es la autoridad: con la consulta cerrada, `POST /api/participations`
y la generación de formatos responden 403 `consulta_no_abierta`. «Proyecto del
Programa» solo se publica con la consulta abierta o concluida; con la consulta
concluida siguen disponibles los documentos, las participaciones y las
respuestas, y el portal muestra el mensaje de cierre.

**Acuse de recepción** (`services/acuse.ts`): PDF de una sola hoja carta con el
modelo aprobado, texto justificado y DejaVu Sans. Prueba una escala de letra de
mayor a menor hasta que cabe; los límites de los campos que lo alimentan
(`participacion-campos.ts`) son los que `acuse.test.ts` comprueba con todos los
campos al máximo. Quien participa lo descarga con un enlace firmado de 48 horas
(`services/acuse-token.ts`, el folio es consecutivo y no basta para pedirlo) y
también le llega adjunto al correo registrado; el panel lo descarga por registro.

**Respuesta a la participación**: el área responsable carga el oficio firmado
(PDF), lo revisa con «Vista previa de la respuesta», puede sustituirlo y solo
entonces lo envía («Enviar respuesta»: asunto «Respuesta a tu participación ·
Folio …»). Cargar no envía. Cada envío queda en `participacion_envios` con su
resultado, y el panel muestra si salió bien o falló.

**Lo público es lo mínimo**: `GET /api/participaciones-publicas` entrega solo
folio y fecha de recepción, y solo se sirven las versiones públicas que el área
responsable publicó (un documento sin publicar da el mismo 404 que un folio que
no existe). El formato escaneado y el oficio firmado son internos.

**Textos del portal con formato**: los 21 textos de párrafo se guardan como HTML
mínimo y canónico (`<p>`, `<strong>`, `<br>`, `text-align`); lo canoniza
`services/texto-rico.ts` al guardar (`saveCustomizations`) y el portal los dibuja
sin insertarlos nunca como HTML. Los textos sin formato de antes se leen igual,
así que no hace falta migrar nada.

## Bitácora de sesiones: cómo se mide el tiempo

El tiempo de una sesión **no** es lo que pasa entre que se inicia y se cierra. La
cookie dura 7 días y casi nadie pulsa «Cerrar sesión» (se cierra la pestaña, se
va a comer, se apaga la computadora): medir así dejaba «en curso» para siempre
las sesiones abandonadas y les sumaba horas que nadie estuvo. Lo que se mide es
la **presencia**:

- **El navegador avisa** (`public/presencia.js`, cargado por la plantilla del
  panel) con un `POST /admin/api/sesion/latido` sin cuerpo, que el frente pasa a
  `POST /api/sessions/ping`. Avisa solo si hay una pestaña del panel **a la
  vista** y la persona **hizo algo en los últimos 2 minutos** (clic, tecla,
  desplazarse, mover el puntero); si el foco o el puntero están en un visor de
  documentos (PDF), que no avisa de lo que pasa dentro, cuenta hasta 10 minutos.
  Cada 30 s mientras está, de inmediato al cargar una pantalla o al volver, y una
  vez más al ocultar la pestaña o salir de la página. Nunca manda duraciones ni
  qué hace la persona: es un «sigo aquí».
- **El servidor cuenta** (`services/sesiones.ts`): suma el tiempo entre avisos
  seguidos con el reloj de Postgres, solo si no se separan más de
  `HUECO_MAXIMO_S` (90 s). Un hueco mayor es una ausencia y no suma. Varias
  pestañas no cuentan doble: el tiempo corre por sesión, no por pestaña.
- **El estado se calcula al consultar**, no se guarda: `en_linea` (aviso de hace
  menos de `EN_LINEA_S` = 90 s), `inactiva` (abierta pero nadie la usa: se fue sin
  cerrar), `cerrada`, `expirada` (pasaron los 7 días) y `revocada` (se cambió la
  contraseña de la cuenta después de abrirla). Ya no hay «en curso» eterno.
- **Las sesiones anteriores a la medición** quedan con `active_seconds` NULL: se
  muestran «Sin medir» y no suman al total ni al promedio. No se inventa un
  tiempo, ni siquiera cuando esa sesión sigue en uso tras actualizar (se mide a
  partir de la siguiente sesión que se inicie).
- Sin JavaScript no hay medición: la sesión queda en 0 s y sin «En línea». Es lo
  correcto cuando no se sabe.

Lo que cuenta como «pausa» tiene tolerancia: las interrupciones de hasta 90 s no
cortan el tiempo, y tras la última actividad corren hasta 2 minutos más (es lo que
se tarda en dar a alguien por ausente). Los valores están en `public/presencia.js`
(`LATIDO_MS`, `AUSENTE_MS`, `VISOR_MS`) y en `services/sesiones.ts`
(`HUECO_MAXIMO_S`, `EN_LINEA_S`); una prueba de contrato vigila que el servidor
tolere al menos dos avisos perdidos del navegador.

Dos detalles de arquitectura que importan para que esto funcione:

- Iniciar sesión se envía con `rmx-document` (navegación completa). Remix navega
  dentro del mismo documento y **no ejecuta los scripts del `<head>`** de la página
  que llega; los scripts del panel (`admin.js`, `editor-texto.js`,
  `presencia.js`) cuelgan de ese `<head>`, así que entrar al panel por una
  navegación interna los dejaba sin cargar hasta recargar a mano.
- La ruta del aviso cuelga de `/api/`: `server.ts` convierte en página de error las
  respuestas no exitosas de las rutas que no lo son, y el script necesita ver el
  401 tal cual para dejar de avisar cuando la sesión terminó.

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

| Método            | Ruta                                                                | Descripción                                                                                |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET               | `/api/health`                                                       | Health check                                                                               |
| POST              | `/api/auth/register`                                                | Crear usuario (body: email, name, password, role?)                                         |
| POST              | `/api/auth/login`                                                   | Login → cookie HttpOnly                                                                    |
| POST              | `/api/auth/logout`                                                  | Cerrar sesión                                                                              |
| GET               | `/api/auth/me`                                                      | Usuario actual                                                                             |
| GET               | `/api/participations`                                               | Listado con filtros + paginación                                                           |
| GET               | `/api/participations/:id`                                           | Detalle + adjuntos                                                                         |
| POST              | `/api/participations`                                               | Crear (multipart: folio autogenerado, origen, nombre, correo, pdf...)                      |
| POST              | `/api/participations/:id/resolucion`                                | Dictaminar + notificar (admin) — flujo canónico de cambio de estado                        |
| DELETE            | `/api/participations/:id`                                           | Eliminar (admin)                                                                           |
| GET               | `/api/participations/:id/attachments/:aid`                          | Ver / descargar adjunto                                                                    |
| GET               | `/api/participations/:id/word`                                      | Exportar .docx (admin)                                                                     |
| POST              | `/api/participations/enviar`                                        | Reenviar participación por correo (admin)                                                  |
| POST              | `/api/mail/test`                                                    | Correo de prueba SMTP (admin) — cableado a Personalización                                 |
| GET               | `/api/actividades?vista=proximas\|avances\|calendario`              | Vistas públicas (solo publicadas; `limite`, `fase`, `mes=YYYY-MM`)                         |
| GET               | `/api/actividades/aviso`                                            | Aviso vigente de la portada                                                                |
| GET               | `/api/actividades/documentos`                                       | Repositorio público de documentos (`tipo`, `fase`)                                         |
| GET               | `/api/actividades/:id`                                              | Ficha pública (solo publicadas)                                                            |
| GET               | `/api/actividades/archivos/:aid`                                    | Ver / descargar archivo (borradores solo para el panel)                                    |
| GET               | `/api/actividades/gestion[/:id]`                                    | Listado y ficha completos para el panel (admin)                                            |
| POST/PUT/DELETE   | `/api/actividades[/:id]`                                            | Alta / edición del mismo registro / baja (admin; multipart con `archivo` + `archivo_tipo`) |
| PATCH/DELETE      | `/api/actividades/archivos/:aid`                                    | Corregir tipo o nombre / quitar un archivo (admin)                                         |
| POST              | `/api/actividades/:id/aviso/enviar`                                 | Enviar el aviso de una actividad por correo (admin)                                        |
| GET/POST/DELETE   | `/api/export/:tabla`, `/api/users`, `/api/stats`, `/api/settings/*` | Exportación, usuarios, stats, personalización (ver `app.ts`)                               |
| GET               | `/api/consulta`                                                     | Etapa de la consulta pública (pública)                                                     |
| PUT               | `/api/consulta`                                                     | Iniciar, concluir o dejar pendiente la consulta (admin)                                    |
| GET               | `/api/acuse/:folio?t=…`                                             | Acuse en PDF con el enlace firmado que recibe quien participa                              |
| GET               | `/api/participations/:id/acuse`                                     | Acuse en PDF desde el panel (admin)                                                        |
| POST              | `/api/sessions/ping`                                                | Aviso de presencia del panel (204): suma tiempo de uso y marca «en línea»                  |
| GET               | `/api/sessions`                                                     | Bitácora de sesiones: estado, tiempo de uso medido y resumen (admin)                       |
| GET/POST          | `/api/formatos`                                                     | Formatos para llenar a mano: listado (`?estado=pendiente`) / generar uno con su folio      |
| GET               | `/api/formatos/:id/pdf`                                             | Formato en blanco con su folio, para imprimir (admin)                                      |
| GET               | `/api/participations/:id/documentos[/:tipo]`                        | Documentos de la participación y correos enviados / el PDF (`?download=1`) (admin)         |
| PUT/PATCH/DELETE  | `/api/participations/:id/documentos/:tipo`                          | Cargar o sustituir / número y fecha del oficio / quitar (admin)                            |
| POST              | `/api/participations/:id/documentos/:tipo/publicacion`              | Publicar o retirar del portal una versión pública (admin)                                  |
| POST              | `/api/participations/:id/respuesta/enviar`                          | Enviar el oficio de respuesta al correo registrado (admin)                                 |
| GET               | `/api/participaciones-publicas`                                     | Listado público (folio y fecha) con buscador por folio                                     |
| GET               | `/api/participaciones-publicas/:folio/participacion\|oficio`        | Versión pública publicada (`?download=1` descarga)                                         |
| GET               | `/api/proyecto`                                                     | Documentos del Proyecto del Programa (vacío con la consulta pendiente)                     |
| GET/POST          | `/api/proyecto/gestion`, `/api/proyecto/documentos`                 | Todos los documentos / cargar varios PDF (admin)                                           |
| PATCH/POST/DELETE | `/api/proyecto/documentos/:id[/mover]`                              | Renombrar / subir o bajar de orden / quitar (admin)                                        |
| GET               | `/api/proyecto/documentos/:id/archivo`                              | El PDF (`?download=1`): público con la consulta abierta o concluida                        |

> **Nota 2026-08-28 (Arquitecto):** Se eliminaron `GET /api/search` (`searchParticipations`) y
> `PATCH /api/participations/:id/estado` (`updateEstado`) por ser huérfanos sin consumidor en
> `app/` y, en el caso de PATCH, por bypasear el flujo canónico de dictamen (`/resolucion` con
> motivo/dirección/cita y auditoría). Ver `backend/src/services/search.ts` eliminado y
> `participations.ts:updateEstado` eliminado. `POST /api/mail/test` se mantiene y ahora está
> cableado a `app/actions/admin/personalizacion-controller.tsx` + `personalizacion-page.tsx`
> (form `testMail`) de forma CSP-compliant.

## Env

| Variable                                              | Default                                                                             | Uso                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                                        | `postgres://postgres:postgres@localhost:5432/ordenamiento`                          | Conexión                                                                       |
| `SESSION_SECRET`                                      | (cambiar en prod)                                                                   | Firma de cookie                                                                |
| `PORT`                                                | `5920`                                                                              | Puerto                                                                         |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | (sin `SMTP_HOST` no se envía correo) / `25`                                         | Servidor de correo                                                             |
| `MAIL_FROM`                                           | `"Bitácora Tlaquepaque" <SMTP_USER>`, o `<no-reply@tlaquepaque.gob.mx>` sin usuario | Remitente de avisos y recuperación de contraseña                               |
| `MAIL_FROM_CONSULTA`                                  | `"Consulta pública POETDUM" <consulta.poetdum@tlaquepaque.gob.mx>`                  | Remitente de los acuses y de las respuestas; el servidor SMTP debe autorizarlo |
| `APP_PUBLIC_URL`                                      | `http://localhost:44100`                                                            | Origen público del portal (enlaces de los correos)                             |
| `TRUST_PROXY`                                         | (vacío)                                                                             | `true` si hay un proxy que pone la IP real del visitante                       |
| `MAX_UPLOAD_MB` / `MAX_UPLOAD_FILES`                  | `100` / `5`                                                                         | Tamaño por archivo y archivos por participación                                |
