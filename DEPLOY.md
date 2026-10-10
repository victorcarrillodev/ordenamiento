# Despliegue en ac.tlaquepaque.gob.mx/ordena

La app (web + backend + Postgres 16) se levanta completa con un solo
comando desde la raíz del repo:

```sh
cp .env.example .env
# edita .env: SESSION_SECRET, ROOT_PASSWORD (y ROOT_EMAIL/ROOT_NAME si quieres)
docker compose up -d --build
```

### Capacidad para adjuntos

El formulario admite hasta **5 archivos de 100 MB** por participación, incluido
GeoPackage (`.gpkg`). Al actualizar una instalación, revisa que `.env` no conserve
`MAX_UPLOAD_MB=50`: usa `MAX_UPLOAD_MB=100` y `MAX_UPLOAD_FILES=5` tanto en web como
en backend, y aplica el fragmento actualizado de `deploy/nginx-ordena.conf`
(cuerpo máximo de 520 MB y plazos de carga ampliados).

El reenvío multipart todavía materializa los archivos en memoria. Compose permite
2 GB para web y 2 GB para backend, además de 1 GB para Postgres; reserva margen
adicional para el sistema y el proxy. Los topes se pueden ajustar con
`WEB_MEMORY_LIMIT` y `BACKEND_MEMORY_LIMIT`. Antes de habilitar cargas concurrentes
de 500 MB en producción, mide el consumo en el servidor y dimensiona memoria y
disco temporal; las pruebas funcionales no sustituyen una prueba de carga allí.

Los correos adjuntan como máximo 10 MB en total. Los archivos restantes siguen en
el expediente y el correo informa de ello para que un adjunto grande no impida
enviar el acuse.

### La cuenta root

El sistema tiene una cuenta **root**: manda sobre todas las demás, incluidas
las de otros root, y es la única que puede repartir ese rango. Por omisión es
**Victor Carrillo Rojas** (`victorcarrillo.dev@gmail.com`); se cambia con
`ROOT_EMAIL` y `ROOT_NAME` en `.env`.

El servidor la siembra en cada arranque y, si ya existía con otro rango, la
eleva a root. Así una instalación anterior no queda sin dueño al actualizar.

Desde el panel, en **Usuarios**, root puede crear cuentas, cambiar rangos, dar
de baja y **restablecer la contraseña de cualquiera sin conocer la anterior**.
**Solo root da de alta cuentas**: un administrador ve la lista y puede cambiar
rangos, dar de baja y restablecer contraseñas, salvo tocar una cuenta root o
repartir ese rango; y nadie puede dejar el sistema sin ninguna cuenta root.

### Alta de cuentas y primer acceso

Al crear una cuenta, root escribe el **nombre**, el **correo** y una
**contraseña provisional**, y elige el rango. La persona recibe un correo con un
enlace a su panel de configuración, donde captura su nombre(s) y apellidos,
crea su propia contraseña (con confirmación) y, si quiere, su foto de perfil;
al terminar entra al panel.

- **La contraseña provisional no va en el correo.** Root se la entrega por otro
  medio. Si la persona prefiere entrar con ella en lugar de usar el enlace, al
  iniciar sesión se le lleva a esa misma pantalla: una cuenta por configurar no
  abre sesión hasta completarla.
- El enlace y la contraseña provisional valen **7 días**. Pasado ese plazo, en
  **Usuarios → Gestionar → Reenviar invitación** root manda un correo nuevo (el
  enlace anterior deja de servir) y renueva el plazo. Mientras tanto la cuenta
  aparece como «Pendiente de configurar» o «Invitación vencida».
- Depende del correo: sin `SMTP_HOST` la cuenta se crea igual, el panel avisa de
  que no salió la bienvenida y la persona puede entrar con la contraseña
  provisional. El enlace usa `APP_PUBLIC_URL` (ver más abajo).
- Al actualizar una instalación que ya tenía cuentas no cambia nada para ellas:
  las columnas nuevas (`users.setup_pending`, `users.setup_expires_at`) y la
  tabla `account_setups` se crean solas al arrancar el backend, y las cuentas
  existentes quedan como ya configuradas.

#### Si te quedas fuera del panel

Hay una herramienta de consola que no requiere iniciar sesión. Ejecutarla exige
acceso a la shell del servidor, y ese acceso **es** la autenticación:

```sh
docker compose exec backend bun run root -- listar
docker compose exec backend bun run root -- password correo@ejemplo.mx nueva-clave
docker compose exec backend bun run root -- promover correo@ejemplo.mx
```

Cambiar una contraseña por esta vía también cierra las sesiones abiertas de esa
cuenta, que es lo que se quiere si estaba comprometida.

> No existe —ni debe existir— una URL que cambie contraseñas sin iniciar
> sesión: quien la encontrara se quedaría con el sistema entero y con los datos
> personales de todas las participaciones.

### Recuperación de contraseña

«¿Olvidaste tu contraseña?» manda un enlace de un solo uso por correo, así que
depende de dos variables de `.env`:

- **`SMTP_HOST`** (y `SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`). Sin `SMTP_HOST` el
  formulario responde «el envío de correo no está disponible» en vez de fallar
  en silencio.
- **`APP_PUBLIC_URL`**: origen público con el que se construye el enlace del
  correo. En este despliegue, `https://ac.tlaquepaque.gob.mx` (sin barra final
  y sin `/ordena`). Si se deja el valor por omisión, los correos saldrán con
  enlaces a `localhost` que nadie podrá abrir. Se toma de aquí y nunca de la
  cabecera `Host` de la petición, que puede falsificarse.

El enlace vence en 60 minutos, solo sirve una vez, y al usarse invalida las
sesiones abiertas de esa cuenta.

### Inicio y cierre de la consulta pública

La consulta pública tiene tres etapas —**pendiente**, **abierta** y
**concluida**— que se cambian desde el panel, en **Participación ciudadana →
Consulta pública**. Mientras esté pendiente no se reciben participaciones y el
apartado «Proyecto del Programa» no se muestra; al iniciarla se hace visible y
se abre el formulario; al concluirla se cierra la recepción y el portal muestra
el mensaje «Consulta pública concluida».

> **Al actualizar una instalación que ya recibía participaciones:** la consulta
> arranca en _pendiente_ y el formulario dejará de recibir hasta que alguien con
> acceso al panel pulse **Iniciar consulta pública**. Hazlo justo después de
> desplegar si la recepción no debe interrumpirse.

### Remitente de los correos

Todos los correos del portal —acuses de recepción, respuestas a las
participaciones, avisos, recuperación de contraseña, confirmación de correo y
bienvenida de cuentas nuevas— salen del **correo de contacto del pie de
página**: el mismo que se publica en el portal. Se cambia en el panel, en
**Personalización → Textos del portal → Pie de página → Correo de contacto
oficial**, y el cambio aplica desde el siguiente correo, sin reiniciar nada. Si
el campo está vacío se usa `ordenamiento@tlaquepaque.gob.mx`. Los mensajes de la
consulta pública firman como «Consulta pública POETDUM» y el resto como
«Bitácora Tlaquepaque»; la dirección es la misma.

> **Al actualizar:** las variables `MAIL_FROM` y `MAIL_FROM_CONSULTA` ya no se
> leen. Si el `.env` las tenía para que el servidor SMTP aceptara el envío,
> hay que dar de alta esa autorización para la dirección del pie (o poner en el
> pie la dirección que el SMTP ya acepta).

El servidor SMTP tiene que **estar autorizado para enviar como esa dirección**
(que el buzón exista y que SPF/DKIM del dominio `tlaquepaque.gob.mx` lo
permitan, o que el relay lo acepte con el usuario de `SMTP_USER`). Si no, el
servidor rechazará el envío o los mensajes caerán en spam. Cada envío de
respuesta queda registrado con su fecha, hora y resultado, y el panel muestra
el error si el servidor lo rechaza. Solo se acepta una dirección en ese campo:
al guardar, el panel rechaza textos que no lo sean.

Esto levanta 3 contenedores en una red interna (`db`, `backend`, `web`).
Solo `web` publica un puerto, y solo en `127.0.0.1:44100` — no queda
expuesto a internet directamente. Al arrancar, el backend migra el schema y
siembra la cuenta ROOT (`ROOT_PASSWORD`) y cualquier cuenta extra que definas
en `backend/seed-admins.json` (ver `backend/README.md`).

### Registro de sesiones: tiempo de uso real

«Registro de sesiones» ya no muestra cuánto lleva abierta una sesión sino cuánto
se **usó** el panel (pestaña a la vista y con actividad), y una sesión que nadie
cerró deja de aparecer «en curso» (cómo se mide: `backend/README.md`). **Solo
una cuenta root puede ver ese registro** (menú, pantalla y `GET /api/sessions`):
un administrador ya no lo ve, y cada cuenta consulta sus últimas sesiones en «Mi
cuenta». Al actualizar una instalación existente:

- La columna `user_sessions.active_seconds` se crea sola al arrancar el backend.
- Las sesiones anteriores se muestran «Sin cerrar» desde su último movimiento y
  «Sin medir»: no suman al tiempo total, porque no se sabe cuánto se usaron.
- Quien tenga la sesión abierta al desplegar aparecerá «En línea» cuando la use,
  pero esa sesión seguirá «Sin medir»: la medición empieza con la siguiente que se
  inicie.
- El aviso es `POST /ordena/admin/api/sesion/latido`: el proxy de enfrente no
  necesita ninguna regla especial, pero no debe cachearlo ni bloquear los POST.

## Migración: se retiró pgvector

La búsqueda ya no usa embeddings: el texto de los PDF vive en
`attachments.texto_extraido` y se consulta con full-text nativo de Postgres.
La imagen de la BD pasó de `pgvector/pgvector:pg16` a `postgres:16`.

**Volumen nuevo:** nada que hacer. `docker compose up -d --build` y listo.

**Volumen `pgdata` que ya existía:** hay que soltar la extensión _antes_ de
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

## Migración: «Actividades y avances del Programa» (v2)

Los apartados Avisos, Reuniones, POEL–Sesiones, Actividades y Documentos del
panel se unificaron en un solo módulo: cada actividad se registra una vez y el
portal decide dónde mostrarla (próximas actividades, calendario, franja de
avisos o avances del Programa) según su fecha, estado y publicación.

**No hay pasos manuales.** Al arrancar, el backend aplica una sola vez
`backend/migrations/002_actividades_programa.sql`, que trae lo ya capturado al
modelo nuevo conservando los ids (los enlaces viejos a fotos y documentos siguen
funcionando):

| Antes                       | Ahora                                                                |
| --------------------------- | -------------------------------------------------------------------- |
| Actividades                 | La misma actividad; «próxima» pasa a «programada»                    |
| Fotos de actividades        | Archivos «Fotografía» de su actividad                                |
| Documentos ligados          | Archivos de las actividades a las que estaban ligados                |
| Documentos sueltos          | Una actividad «Publicación de producto técnico» (realizada) cada uno |
| Reuniones                   | Actividades «Reunión técnica»                                        |
| Sesiones POEL (+ archivos)  | Actividades según su categoría (Comité, Taller, Consulta pública…)   |
| Avisos                      | Actividades con su aviso configurado                                 |
| Respaldo de los indicadores | El mismo archivo, ahora dentro de su actividad                       |

Lo que ya se veía en el portal sigue publicado. Lo que el portal nunca mostró
entra como **borrador**: los avisos (eran internos del panel) y las reuniones
ya pasadas. Conviene revisarlos en «Actividades y avances» (filtro
«Publicación: Borrador») y publicar lo que corresponda; también las actividades
viejas que quedaron con tipo «Otra».

La sección pública «Seguimiento y evaluación» muestra el aviso «Esta sección
estará disponible una vez aprobado el Programa…» hasta que alguien marque el
Programa como aprobado en **Indicadores** (el cambio queda en la bitácora de
Personalización).

Los nombres, lugares y direcciones quedan en una sola línea, y los nombres que
pasaban del límite del formulario (el panel viejo no tenía) se recortan con «…».
Si dos tablas viejas compartían un id (solo pasa con datos importados o
capturados a mano), la segunda fila se copia con un id nuevo en vez de
perderse; conviene revisar el log del primer arranque:

```sh
docker compose logs backend | grep "Migración 002"
```

**Tablas viejas.** `avisos`, `reuniones`, `poel_sesiones`, `poel_archivos`,
`documentos`, `actividad_fotos` y `actividad_documentos` se conservan como
respaldo en las bases que ya las tenían; el código ya no las usa. `actividades`
se convierte en su sitio, así que su versión anterior queda en
`actividades_v1`. Cuando se haya comprobado que todo quedó bien, se pueden
borrar (los archivos en disco no se tocan: los usan las actividades):

```sh
docker compose exec db psql -U postgres -d ordenamiento -c "DROP TABLE actividad_documentos, actividad_fotos, documentos, poel_archivos, poel_sesiones, reuniones, avisos, actividades_v1"
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
